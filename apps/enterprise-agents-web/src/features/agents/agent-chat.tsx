import {
  AGENT_CONSTANTS,
  type AgentChatResponseDto,
  type AgentSchema,
} from '@enterprise-agents/contracts';
import { useSignal } from '@preact/signals-react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, ErrorState } from '~/libs/ui';
import { api } from '~/services/http/api-client';

export function AgentChat({
  agent_id,
  organization_id,
}: {
  agent_id: AgentSchema['id'];
  organization_id: AgentSchema['organization_id'];
}) {
  const promptSignal = useSignal('');
  const [prompt, setPromptState] = useState('');
  const setPrompt = (value: string) => {
    promptSignal.value = value;
    setPromptState(value);
  };
  const chatMutation = useMutation({
    mutationFn: () =>
      api<AgentChatResponseDto>(`/agents/${agent_id}/chat`, {
        method: 'POST',
        body: JSON.stringify({ organization_id, prompt }),
      }),
  });

  return (
    <section className="mt-4 rounded-lg border border-border-ui p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (prompt.trim()) chatMutation.mutate();
        }}
      >
        <label
          className="text-sm font-medium"
          htmlFor={`agent-prompt-${agent_id}`}
        >
          Test prompt
        </label>
        <textarea
          id={`agent-prompt-${agent_id}`}
          maxLength={AGENT_CONSTANTS.MAX_CHAT_PROMPT_LENGTH}
          required
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="field"
        />
        <div className="mt-2">
          <Button
            type="submit"
            disabled={chatMutation.isPending || !prompt.trim()}
          >
            {chatMutation.isPending ? 'Asking local model…' : 'Ask agent'}
          </Button>
        </div>
      </form>
      {chatMutation.error && (
        <div className="mt-3">
          <ErrorState error={chatMutation.error} />
        </div>
      )}
      {chatMutation.data && (
        <div role="status" className="mt-4 whitespace-pre-wrap text-sm">
          <p className="mb-2 font-semibold">
            Response · {chatMutation.data.model}
          </p>
          {chatMutation.data.answer}
        </div>
      )}
    </section>
  );
}
