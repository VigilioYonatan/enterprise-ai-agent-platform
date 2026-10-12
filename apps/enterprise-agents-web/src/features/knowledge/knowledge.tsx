import type {
  KnowledgeBaseResponseDto,
  KnowledgeDocumentResponseDto,
  KnowledgeSearchResponseDto,
  MemberResponseDto,
} from '@enterprise-agents/contracts';
import { useSignal } from '@preact/signals-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useWorkspace } from '~/app/workspace-context';
import { StatusBadge } from '~/libs/status-badge';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  TableSkeleton,
} from '~/libs/ui';
import { api } from '~/services/http/api-client';
import {
  ALLOWED_IMPORT_FILE_REGEX,
  DOCUMENT_ACCESS_MANAGER_ROLES,
  DOCUMENTS_POLL_INTERVAL_MS,
  MAX_IMPORT_DOCUMENT_BYTES,
  MAX_IMPORT_TITLE_LENGTH,
  MIN_DOCUMENT_CONTENT_LENGTH,
  MIN_KNOWLEDGE_BASE_NAME_LENGTH,
  MIN_SEARCH_QUERY_LENGTH,
} from './constants/knowledge.constants';

export function KnowledgePage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [base_id, setBase] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeSearchResponseDto | null>(
    null,
  );
  const sourceError = useSignal('');
  const [import_error, set_import_error_state] = useState('');
  const set_import_error = (message: string) => {
    sourceError.value = message;
    set_import_error_state(message);
  };
  const [share_targets, set_share_targets] = useState<Record<string, string>>(
    {},
  );

  const bases = useQuery({
    queryKey: ['knowledgeBases', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<KnowledgeBaseResponseDto[]>(
        `/knowledge-bases?organization_id=${organization_id}`,
      ),
  });

  const members = useQuery({
    queryKey: ['members', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<MemberResponseDto[]>(
        `/memberships?organization_id=${organization_id}`,
      ),
  });

  const documentsQuery = useQuery({
    queryKey: ['documents', organization_id],
    enabled: Boolean(organization_id),
    refetchInterval: DOCUMENTS_POLL_INTERVAL_MS,
    queryFn: () =>
      api<KnowledgeDocumentResponseDto[]>(
        `/documents?organization_id=${organization_id}`,
      ),
  });

  const create_base_mutation = useMutation({
    mutationFn: () =>
      api('/knowledge-bases', {
        method: 'POST',
        body: JSON.stringify({ organization_id, name }),
      }),
    onSuccess: () => {
      setName('');
      void queryClient.invalidateQueries({
        queryKey: ['knowledgeBases', organization_id],
      });
    },
  });

  const create_document_mutation = useMutation({
    mutationFn: () =>
      api('/documents', {
        method: 'POST',
        body: JSON.stringify({
          organization_id,
          knowledge_base_id: base_id,
          title,
          content,
        }),
      }),
    onSuccess: () => {
      setTitle('');
      setContent('');
      set_import_error('');
      void queryClient.invalidateQueries({
        queryKey: ['documents', organization_id],
      });
    },
  });

  const search = useMutation({
    mutationFn: () =>
      api<KnowledgeSearchResponseDto>('/knowledge-searches', {
        method: 'POST',
        body: JSON.stringify({
          organization_id,
          knowledge_base_id: base_id,
          query,
        }),
      }),
    onSuccess: setResults,
  });

  const reindex = useMutation({
    mutationFn: (id: KnowledgeDocumentResponseDto['id']) =>
      api(`/documents/${id}/reindex`, {
        method: 'POST',
        body: JSON.stringify({ organization_id }),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['documents', organization_id],
      }),
  });

  const share = useMutation({
    mutationFn: ({
      document_id,
      user_id,
    }: {
      document_id: KnowledgeDocumentResponseDto['id'];
      user_id: MemberResponseDto['user_id'];
    }) =>
      api(`/documents/${document_id}/grants`, {
        method: 'POST',
        body: JSON.stringify({ organization_id, user_id }),
      }),
    onSuccess: (_response, variables) => {
      set_share_targets((previous) => ({
        ...previous,
        [variables.document_id]: '',
      }));
    },
  });

  const revoke_access_mutation = useMutation({
    mutationFn: ({
      document_id,
      user_id,
    }: {
      document_id: KnowledgeDocumentResponseDto['id'];
      user_id: MemberResponseDto['user_id'];
    }) =>
      api(
        `/documents/${document_id}/grants/${encodeURIComponent(user_id)}?organization_id=${organization_id}`,
        {
          method: 'DELETE',
        },
      ),
  });

  async function importText(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_IMPORT_FILE_REGEX.test(file.name)) {
      set_import_error('Only .txt, .md or .csv text files are supported here.');
      return;
    }
    if (file.size > MAX_IMPORT_DOCUMENT_BYTES) {
      set_import_error('Maximum document size is 16 KB.');
      return;
    }
    try {
      set_import_error('');
      const body =
        typeof file.text === 'function'
          ? await file.text()
          : await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result ?? ''));
              reader.onerror = () =>
                reject(reader.error ?? new Error('Unable to read file'));
              reader.readAsText(file);
            });
      setTitle(file.name.slice(0, MAX_IMPORT_TITLE_LENGTH));
      setContent(body);
    } catch {
      set_import_error('Unable to read text file contents.');
    }
  }

  const base_documents =
    documentsQuery.data?.filter(
      (documentItem) => documentItem.knowledge_base_id === base_id,
    ) ?? [];

  return (
    <>
      <PageHeader
        title="Knowledge"
        description="Private, document-ACL protected hybrid retrieval (PostgreSQL FTS + pgvector + RRF)."
      />
      {!org ? (
        <EmptyState
          title="Select workspace"
          message="Choose an organization first."
        />
      ) : (
        <div className="space-y-5">
          <Card>
            <h2 className="font-semibold">Knowledge bases</h2>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                create_base_mutation.mutate();
              }}
            >
              <div className="flex-1">
                <Field
                  label="New base name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={MIN_KNOWLEDGE_BASE_NAME_LENGTH}
                />
              </div>
              <div className="self-end">
                <Button type="submit" disabled={create_base_mutation.isPending}>
                  Create
                </Button>
              </div>
            </form>
            {create_base_mutation.error && (
              <div className="mt-3">
                <ErrorState error={create_base_mutation.error} />
              </div>
            )}
            <label
              className="mt-4 block text-sm font-semibold"
              htmlFor="active-kb-select"
            >
              Active knowledge base
            </label>
            <select
              id="active-kb-select"
              className="field"
              value={base_id}
              onChange={(event) => {
                setBase(event.target.value);
                setResults(null);
              }}
            >
              <option value="">Select a base</option>
              {bases.data?.map((knowledgeBase) => (
                <option key={knowledgeBase.id} value={knowledgeBase.id}>
                  {knowledgeBase.name} ({knowledgeBase.id.slice(0, 8)})
                </option>
              ))}
            </select>
            {base_id && (
              <p className="mt-2 font-mono text-xs text-foreground-muted">
                Knowledge Base ID: {base_id}
              </p>
            )}
          </Card>

          {base_id && (
            <>
              <Card>
                <h2 className="font-semibold">Index a text document</h2>
                <p className="mt-1 text-xs text-foreground-muted">
                  Asynchronous local embeddings. Text or .txt/.md/.csv (up to 16
                  KB); the indexer must have the configured model available.
                </p>
                <label
                  className="mt-3 block text-sm font-semibold"
                  htmlFor="kb-file-import"
                >
                  Import text file
                </label>
                <input
                  id="kb-file-import"
                  type="file"
                  className="field"
                  accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
                  onChange={(event) => void importText(event.target.files?.[0])}
                />
                {import_error && (
                  <div className="mt-3">
                    <ErrorState error={new Error(import_error)} />
                  </div>
                )}
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    create_document_mutation.mutate();
                  }}
                >
                  <Field
                    label="Title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    minLength={2}
                    required
                  />
                  <div>
                    <label
                      className="block text-sm font-semibold"
                      htmlFor="kb-doc-content"
                    >
                      Document text
                    </label>
                    <textarea
                      id="kb-doc-content"
                      className="field"
                      rows={6}
                      minLength={MIN_DOCUMENT_CONTENT_LENGTH}
                      maxLength={MAX_IMPORT_DOCUMENT_BYTES}
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={create_document_mutation.isPending}
                  >
                    Queue indexing
                  </Button>
                </form>
                {create_document_mutation.error && (
                  <div className="mt-3">
                    <ErrorState error={create_document_mutation.error} />
                  </div>
                )}

                <h3 className="mt-5 font-medium">Documents you can access</h3>
                {documentsQuery.isLoading ? (
                  <div role="status" aria-label="Loading documents…">
                    <p className="sr-only">Loading documents…</p>
                    <TableSkeleton rows={3} columns={2} />
                  </div>
                ) : (
                  <ul className="mt-2 space-y-3 text-sm">
                    {base_documents.map((documentItem) => {
                      const selected_member =
                        share_targets[documentItem.id] ?? '';
                      return (
                        <li
                          key={documentItem.id}
                          className="border-t border-border-ui py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <strong>{documentItem.title}</strong>
                            <StatusBadge status={documentItem.status} />
                          </div>
                          {documentItem.index_error && (
                            <p
                              role="alert"
                              className="mt-1 text-xs text-red-600"
                            >
                              Indexing: {documentItem.index_error}
                            </p>
                          )}
                          {documentItem.status === 'ready' && (
                            <p className="mt-1 text-xs text-foreground-muted">
                              Model: {documentItem.index_model}
                            </p>
                          )}
                          {(documentItem.status === 'failed' ||
                            documentItem.status === 'ready') && (
                            <div className="mt-2">
                              <Button
                                variant="secondary"
                                type="button"
                                disabled={reindex.isPending}
                                onClick={() => reindex.mutate(documentItem.id)}
                              >
                                Reindex
                              </Button>
                            </div>
                          )}
                          {DOCUMENT_ACCESS_MANAGER_ROLES.includes(org.role) && (
                            <div className="mt-3 flex flex-wrap items-end gap-2">
                              <label
                                className="min-w-48 flex-1 text-sm font-medium"
                                htmlFor={`share-member-${documentItem.id}`}
                              >
                                Manage member read access
                                <select
                                  id={`share-member-${documentItem.id}`}
                                  className="field"
                                  value={selected_member}
                                  onChange={(event) =>
                                    set_share_targets((previous) => ({
                                      ...previous,
                                      [documentItem.id]: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Select a member</option>
                                  {members.data?.map((member) => (
                                    <option
                                      key={member.user_id}
                                      value={member.user_id}
                                    >
                                      {member.email}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <Button
                                variant="secondary"
                                type="button"
                                disabled={!selected_member || share.isPending}
                                onClick={() =>
                                  share.mutate({
                                    document_id: documentItem.id,
                                    user_id: selected_member,
                                  })
                                }
                              >
                                Share
                              </Button>
                              <Button
                                variant="danger"
                                type="button"
                                disabled={
                                  !selected_member ||
                                  revoke_access_mutation.isPending
                                }
                                onClick={() =>
                                  revoke_access_mutation.mutate({
                                    document_id: documentItem.id,
                                    user_id: selected_member,
                                  })
                                }
                              >
                                Revoke
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {!documentsQuery.isLoading && base_documents.length === 0 && (
                  <p className="mt-2 text-sm text-foreground-muted">
                    No accessible documents in this base.
                  </p>
                )}
                {share.error && <ErrorState error={share.error} />}
                {revoke_access_mutation.error && (
                  <ErrorState error={revoke_access_mutation.error} />
                )}
                {reindex.error && <ErrorState error={reindex.error} />}
              </Card>

              <Card>
                <h2 className="font-semibold">Hybrid semantic search</h2>
                <form
                  className="mt-4 flex flex-wrap items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    search.mutate();
                  }}
                >
                  <div className="flex-1">
                    <Field
                      label="Search query"
                      minLength={MIN_SEARCH_QUERY_LENGTH}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={search.isPending}>
                    Search
                  </Button>
                </form>
                {search.error && (
                  <div className="mt-3">
                    <ErrorState error={search.error} />
                  </div>
                )}
                {results && (
                  <p className="mt-3 text-xs text-foreground-muted">
                    {results.mode} · {results.embedding_model} · ACL enforced
                  </p>
                )}
                <ul className="mt-4 space-y-3">
                  {results?.results.map((chunk) => (
                    <li
                      key={chunk.id}
                      className="rounded-lg border border-border-ui p-3"
                    >
                      <h3 className="font-medium">{chunk.title}</h3>
                      <p className="mt-1 text-sm text-foreground-muted">
                        {chunk.excerpt}
                      </p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        Citation: document {chunk.document_id} · version{' '}
                        {chunk.source_version} · chunk {chunk.id}
                      </p>
                    </li>
                  ))}
                </ul>
                {results?.results.length === 0 && (
                  <p className="mt-3 text-sm text-foreground-muted">
                    No authorized matching chunks.
                  </p>
                )}
              </Card>
            </>
          )}
        </div>
      )}
    </>
  );
}
