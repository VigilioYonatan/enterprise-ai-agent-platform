Feature: Four-eyes approval policy
  Sensitive actions require an independent authorized and unexpired approval.

  Scenario: An administrator different from the requester can approve
    Given a pending approval requested by "author"
    And an approver "reviewer" has role "admin"
    When the approval policy is evaluated
    Then the approval decision is permitted

  Scenario: A requester cannot approve their own action
    Given a pending approval requested by "same"
    And an approver "same" has role "owner"
    When the approval policy is evaluated
    Then the approval decision is forbidden

  Scenario: A viewer cannot approve an action
    Given a pending approval requested by "author"
    And an approver "reviewer" has role "viewer"
    When the approval policy is evaluated
    Then the approval decision is forbidden

  Scenario: An expired request is never approvable
    Given an expired approval requested by "author"
    And an approver "reviewer" has role "owner"
    When the approval policy is evaluated
    Then the approval decision is forbidden
