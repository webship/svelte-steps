@must-fail
Feature: Assertions on the app, its navigation and its errors that must fail
  Each scenario asserts something that is not true of the demo, at its last step.

  @needs-javascript
  Scenario: A page built without client-side code is not taken over
    Fails with: Expected the app to have taken over the page, but the page has no client-side code.
    Given I am on "/about"
    Then the app should have taken over the page

  @needs-javascript
  Scenario: A page with client-side code
    Fails with: Expected the page to have no client-side code, but it loads the app's start script.
    Given I am on "/"
    Then the page should have no client-side code

  @no-javascript
  Scenario: Without JavaScript nothing takes the page over
    Fails with: Expected the app to have taken over the page, but the browser has JavaScript off.
    Given I am on "/"
    Then the app should have taken over the page

  @needs-javascript
  Scenario: A navigation inside the app
    Fails with: Expected the last navigation to have loaded a whole page, but it stayed in the app.
    Given I am on "/"
    When I follow the "Sverdle" link in the app
    Then the last navigation should have loaded a whole page

  @no-javascript
  Scenario: A whole page load
    Fails with: Expected the last navigation to have stayed in the app, but it loaded a whole page.
    Given I am on "/"
    When I follow the "Sverdle" link in the app
    Then the last navigation should have stayed in the app

  @needs-javascript
  Scenario: Another title
    Fails with: Expected the navigation to be announced as "About", but the announcer says "Sverdle".
    Given I am on "/"
    When I follow the "Sverdle" link in the app
    Then the navigation should be announced as "About"

  Scenario: Another link marks the current page
    Fails with: Expected the link "About" to mark the current page, but it does not.
    Given I am on "/"
    Then the "About" link should mark the current page

  @needs-javascript
  Scenario: The focus on a button the scenario pressed
    Fails with: Expected the keyboard to start at the top of the page, but the focus is on button
    Given I am on "/"
    When I press "Increase the counter by one" by attr
    Then I should be at the top of the page for the keyboard

  Scenario: A link the page does not have
    Fails with: Expected a link named "Contact" on the page, but there is none.
    Given I am on "/"
    When I follow the "Contact" link in the app

  Scenario: No navigation yet
    Fails with: Expected a navigation of the scenario, but none of its steps followed one.
    Given I am on "/"
    Then the last navigation should have stayed in the app

  Scenario: An error page that is not the asked one
    Fails with: Expected the page to show the 500 error, but the page loaded with the status 404
    Given I am on "/no-such-page"
    Then the page should show the 500 error

  Scenario: An error page that says something else
    Fails with: Expected the page to show the 404 error "Gone", but it does not say "Gone".
    Given I am on "/no-such-page"
    Then the page should show the 404 error "Gone"

  Scenario: A page that is not an error page
    Fails with: Expected the page to show the 404 error, but the page loaded with the status 200
    Given I am on "/"
    Then the page should show the 404 error
