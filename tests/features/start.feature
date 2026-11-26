@start
Feature: The app takes the server's page over
  The demo of the official create flow, built with the Node adapter. A page arrives as the server's
  HTML; the app's start script then takes it over in the browser. Two of its pages are built without
  client-side code: loaded directly, nothing takes them over.

  @critical @needs-javascript
  Scenario: A page with client-side code is taken over
    Given I am on "/"
    And the app has taken over the page
    Then the app should have taken over the page

  Scenario: A page built without client-side code is not waited on
    Given I am on "/about"
    And the app has taken over the page
    Then the page should have no client-side code
    And I should see "About this app"

  @no-javascript
  Scenario: Without JavaScript no page is taken over
    Given I am on "/sverdle"
    And the app has taken over the page
    Then I should see "Sverdle"
