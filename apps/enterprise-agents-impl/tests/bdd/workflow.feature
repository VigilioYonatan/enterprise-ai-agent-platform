Feature: Workflow publication rules
  Every published workflow requires a connected, acyclic graph.

  Scenario: A valid workflow can be published
    Given an automation graph with one start and one output
    When I validate the publication graph
    Then publication is allowed

  Scenario: A workflow with a cycle cannot be published
    Given a graph with a cycle
    When I validate the publication graph
    Then publication is rejected for "Cycles are not allowed"

  Scenario: A dangerous external tool cannot run
    Given a graph containing a disallowed tool
    When I validate the publication graph
    Then publication is rejected for "must use an allowlisted tool_key"
