Feature: Indexable documents must produce bounded, deterministic segments
  Indexing the same document revision must not change its chunk boundaries.

  Scenario: A long text document becomes bounded chunks
    Given a repeated document containing 500 words
    When the document is split into segments with a 450 character limit
    Then each segment contains at most 450 characters
    And the document is split deterministically

  Scenario: Empty documents produce no searchable chunks
    Given an empty text document
    When the document is split into segments with a 450 character limit
    Then no segments are produced
