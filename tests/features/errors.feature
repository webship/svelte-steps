@errors
Feature: Error pages
  An address the app does not know loads its error page, with the status in the first heading and
  the message under it.

  @critical
  Scenario: An address the app does not know
    Given I am on "/no-such-page"
    Then the page should show the 404 error "Not Found"
    And the response status code should be 404
