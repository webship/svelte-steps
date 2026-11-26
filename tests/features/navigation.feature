@navigation
Feature: The app's own navigation
  A link of a page the app has taken over takes the next page inside the app: the address changes,
  the route announcer tells screen readers the new page's title, the link of the current page moves,
  and the keyboard starts again at the top. A page that has no client-side code, or a browser without
  JavaScript, loads a whole page instead.

  @critical @needs-javascript
  Scenario: A link stays in the app, is announced, and moves the current page
    Given I am on "/"
    When I follow the "Sverdle" link in the app
    Then the last navigation should have stayed in the app
    And the navigation should be announced as "Sverdle"
    And the "Sverdle" link should mark the current page
    And I should be at the top of the page for the keyboard
    When I go back in the app
    Then the last navigation should have stayed in the app
    And the navigation should be announced as "Home"
    And the "Home" link should mark the current page

  @needs-javascript
  Scenario: A link the pointer rested on is fetched ahead
    Given I am on "/"
    When I point at the "Sverdle" link
    And I follow the "Sverdle" link in the app
    Then the last navigation should have stayed in the app
    And the navigation should be announced as "Sverdle"

  @needs-javascript
  Scenario: A page without client-side code, reached inside the app
    Given I am on "/sverdle"
    When I follow the "i How to play" link in the app
    Then the last navigation should have stayed in the app
    And the navigation should be announced as "How to play Sverdle"

  Scenario: From a page without client-side code every link loads a whole page
    Given I am on "/about"
    When I follow the "Sverdle" link in the app
    Then the last navigation should have loaded a whole page
    And the "Sverdle" link should mark the current page

  @no-javascript
  Scenario: Without JavaScript every link loads a whole page
    Given I am on "/"
    When I follow the "About" link in the app
    Then the last navigation should have loaded a whole page
    And the "About" link should mark the current page
    When I go back in the app
    Then the last navigation should have loaded a whole page
    And the "Home" link should mark the current page
