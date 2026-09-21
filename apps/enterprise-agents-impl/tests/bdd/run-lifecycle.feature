Feature: Durable run state transitions
  A completed or cancelled run cannot be silently re-opened.

  Scenario: A waiting run can resume after an approval
    Given a run is "waiting_approval"
    When a transition to "queued" is requested
    Then the run transition is allowed

  Scenario: A completed run cannot be queued again
    Given a run is "completed"
    When a transition to "queued" is requested
    Then the run transition is rejected

  Scenario: A cancelled run cannot be executed again
    Given a run is "cancelled"
    When a transition to "running" is requested
    Then the run transition is rejected
