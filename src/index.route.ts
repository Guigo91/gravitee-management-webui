/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import UserService from './services/user.service';
import { User } from './entities/user';
import { IScope } from 'angular';
import { StateService } from '@uirouter/core';
import { StateProvider, UrlService } from '@uirouter/angularjs';
import OrganizationService from './services/organization.service';

function reinitToDefaultOrganization($window: angular.IWindowService, Constants) {
  $window.localStorage.setItem('gv-last-organization-loaded', 'DEFAULT');
  if (Constants.baseURL.endsWith('/')) {
    Constants.baseURL = Constants.baseURL.slice(0, -1);
  }

  let basePath;
  let orgEnvIndex = Constants.baseURL.indexOf('/organizations');
  if (orgEnvIndex >= 0) {
    Constants.baseURL = Constants.baseURL.substr(0, orgEnvIndex);
  }
  basePath = Constants.baseURL;

  Constants.org.baseURL = `${basePath}/organizations/DEFAULT`;
  Constants.env.baseURL = `${Constants.org.baseURL}/environments/{:envId}`;
}

function routerConfig($stateProvider: StateProvider, $urlServiceProvider: UrlService) {
  'ngInject';
  $stateProvider
    .state(
      'root',
      {
        abstract: true,
        template: '<div layout=\'row\'>' +
          '<div ui-view=\'sidenav\' class=\'gravitee-sidenav\'></div>' +
          '<md-content ui-view layout=\'column\' flex style=\'height: 100vh\' class=\'md-content\'></md-content>' +
          '</div>',
        resolve: {
          graviteeUser: (UserService: UserService) => UserService.current()
        }
      }
    )
    .state(
      'withoutSidenav',
      {
        parent: 'root',
        abstract: true,
        views: {
          '': {
            template: '<div flex layout="row">' +
              '<div class="gv-main-container" ui-view layout="column" flex></div>' +
              '<gv-contextual-doc></gv-contextual-doc>' +
              '</div>'
          }
        }
      }
    )
    .state(
      'withSidenav',
      {
        parent: 'root',
        abstract: true,
        url: '/environments/:environmentId',
        views: {
          'sidenav': {
            component: 'gvSidenav'
          },
          '': {
            template: '<div flex layout="row">' +
              '<div class="gv-main-container" ui-view layout="column" flex></div>' +
              '<gv-contextual-doc></gv-contextual-doc>' +
              '</div>'
          }
        },
        resolve: {
          allMenuItems: ($state: StateService) => $state.get(),
          menuItems: ($state: StateService, graviteeUser: User, Constants: any) => {
            'ngInject';
            return $state.get()
              .filter((state: any) => !state.abstract && state.data && state.data.menu)
              .filter(routeMenuItem => {
                let isMenuItem = routeMenuItem.data.menu.firstLevel;
                let isMenuAllowed = !routeMenuItem.data.perms || !routeMenuItem.data.perms.only
                  || graviteeUser.allowedTo(routeMenuItem.data.perms.only);
                return isMenuItem && isMenuAllowed;
              });
          }
        }
      }
    )
    .state('user', {
      url: '/user',
      component: 'user',
      parent: 'withSidenav',
      resolve: {
        user: (graviteeUser: User) => graviteeUser
      }
    })
    .state('login', {
      url: '/login?redirectUri',
      template: require('./user/login/login.html'),
      controller: 'LoginController',
      controllerAs: '$ctrl',
      redirectTo: transition => {
        const UserService = transition.injector().get('UserService');
        if (UserService.currentUser && UserService.currentUser.id) {
          return 'management';
        }
      },
      resolve: {
        identityProviders: (OrganizationService: OrganizationService) => OrganizationService.listSocialIdentityProviders().then(response => response.data)
      },
      params: {
        redirectUri: {
          type: 'string'
        }
      }
    })
    .state('registration', {
      url: '/registration',
      template: require('./user/registration/registration.html'),
      controller: 'RegistrationController',
      controllerAs: '$ctrl',
      redirectTo: transition => {
        const UserService = transition.injector().get('UserService');
        if (UserService.currentUser && UserService.currentUser.id) {
          return 'management';
        }
      },
    })
    .state('confirm', {
      url: '/registration/confirm/:token',
      template: require('./user/registration/confirm/confirm.html'),
      controller: 'ConfirmController',
      controllerAs: 'confirmCtrl',
    })
    .state('resetPassword', {
      url: '/resetPassword/:token',
      template: require('./user/resetPassword/resetPassword.html'),
      controller: 'ResetPasswordController',
      controllerAs: 'resetPasswordCtrl',
    })
    .state('logout', {
      template: '<div class="gravitee-no-sidenav-container"></div>',
      controller: (UserService: UserService, $state: StateService, $rootScope: IScope, $window: ng.IWindowService, Constants) => {
        delete Constants.org.currentEnv;
        delete Constants.org.environments;
        UserService.logout().then(
          () => {
            $state.go('login');
            $rootScope.$broadcast('graviteeUserRefresh', {});
            $rootScope.$broadcast('graviteeUserCancelScheduledServices');
            let userLogoutEndpoint = $window.localStorage.getItem('user-logout-url');
            $window.localStorage.removeItem('user-logout-url');
            reinitToDefaultOrganization($window, Constants);
            if (userLogoutEndpoint != null) {
              $window.location.href = userLogoutEndpoint + encodeURIComponent(window.location.origin);
            }
          }
        );
      }
    })
    .state('newsletter', {
      url: '/newsletter',
      template: require('./user/newsletter/newsletter-subscription.html'),
      controller: 'NewsletterSubscriptionController',
      controllerAs: '$ctrl'
    });

  $urlServiceProvider.rules.otherwise('/login');
}

export default routerConfig;
