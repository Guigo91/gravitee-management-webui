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
import ApplicationService from '../../../../services/application.service';
import NotificationService from '../../../../services/notification.service';
import { ApplicationType } from '../../../../entities/application';
import _ = require('lodash');
import ApiService from '../../../../services/api.service';

class ApplicationCreationController {
  application: any;
  enabledApplicationTypes: ApplicationType[];
  private steps: any[];
  private selectedStep: number = 0;
  private selectedAPIs: any[] = [];
  private selectedPlans: any[] = [];
  private messageByPlan: any = {};
  private applicationType: string;
  private apis: any[] = [];

  constructor(private Constants, private $state, private $mdDialog, private ApplicationService: ApplicationService,
              private NotificationService: NotificationService, private $q,
              private ApiService: ApiService) {
    'ngInject';
    this.steps = [{
      badgeClass: 'disable',
      badgeIconClass: 'glyphicon-refresh',
      title: 'General',
      content: 'Name and description',
      completed: false
    }, {
      badgeClass: 'disable',
      badgeIconClass: 'glyphicon-refresh',
      title: 'Security',
      content: this.clientRegistrationEnabled() ? 'OIDC configuration' : 'Type and client id',
      completed: false
    }, {
      badgeClass: 'disable',
      badgeIconClass: 'glyphicon-refresh',
      title: 'Subscriptions',
      content: 'Subscribe to APIs',
      completed: false
    }];
  }

  $onInit() {
    this.ApiService.list().then(response => this.apis = response.data );
  }


  next() {
    this.steps[this.selectedStep].completed = true;
    this.steps[this.selectedStep].badgeClass = 'info';
    this.steps[this.selectedStep].badgeIconClass = 'glyphicon-ok-circle';
    this.steps[0].title = this.application.name;
    if (this.selectedStep > 0) {
      this.applicationType = this.ApplicationService.getType(this.application);
      this.steps[1].title = this.applicationType;
    }
    this.goToStep(this.selectedStep + 1);
  }

  previous() {
    if (this.selectedStep === 0) {
      this.$state.go('management.applications.list');
    } else {
      this.goToStep(this.selectedStep - 1);
    }
  }

  goToStep(step) {
    this.selectedStep = step;
    this.steps[2].title = this.getReadableApiSubscriptions();
  }

  create() {
    let alert = this.$mdDialog.confirm({
      title: 'Create application?',
      content: 'The application ' + this.application.name + ((this.applicationType) ? ' of type ' + this.applicationType : '') + ' will be created.',
      ok: 'CREATE',
      cancel: 'CANCEL'
    });

    this.$mdDialog
      .show(alert)
      .then(() => {
        this.ApplicationService.create(this.application).then((response) => {
          let application = response.data;
          let promises = _.map(this.selectedPlans, (plan) => this.ApplicationService.subscribe(application.id, plan.id, this.messageByPlan[plan.id]));
          this.$q.all(promises).then(() => {
            this.NotificationService.show('Application ' + this.application.name + ' has been created');
            this.$state.go('management.applications.application.general', {applicationId: application.id}, {reload: true});
          });
        });
      });
  }

  clientRegistrationEnabled() {
    return this.Constants.env.settings.application && this.Constants.env.settings.application.registration && this.Constants.env.settings.application.registration.enabled;
  }

  isOAuthClient() {
    return this.application && this.application.settings && this.application.settings.oauth;
  }

  onSubscribe(api, plan) {
    if (plan.comment_required) {
      let confirm = this.$mdDialog.prompt()
        .title('Subscription message')
        .placeholder(plan.comment_message ? plan.comment_message : 'Fill a message to the API owner')
        .ariaLabel('Subscription message')
        .required(true)
        .ok('Confirm')
        .cancel('Cancel');

      this.$mdDialog.show(confirm).then((message) => {
        this.messageByPlan[plan.id] = message;
        this.confirmSubscription(api, plan);
      }, () => {
      });
    } else {
      this.confirmSubscription(api, plan);
    }
  }

  confirmSubscription(api, plan) {
    this.selectedAPIs.push(api);
    plan.alreadySubscribed = true;
    this.selectedPlans.push(plan);
    this.steps[2].title = this.getReadableApiSubscriptions();
  }

  onUnsubscribe(api, plan) {
    plan.alreadySubscribed = false;
    _.remove(this.selectedPlans, {id: plan.id});
    let index = _.findIndex(this.selectedAPIs, {id: api.id});
    this.selectedAPIs.splice(index, 1);
    this.steps[2].title = this.getReadableApiSubscriptions();
  }

  getReadableApiSubscriptions(): string {
    let plansByApi = _.groupBy(this.selectedPlans, 'apis');
    let multipleApis = _.keys(plansByApi).length > 1;
    return `Subscribed to API${multipleApis ? 's:' : ''} ` + _.map(plansByApi, (plans, api) => {
      return `${multipleApis ? '</br>- <code>' : '<code>'} ` + _.find(this.selectedAPIs, a => a.id === api).name + '</code> with plan <code>' + _.join(_.map(plans, 'name'), '</code>, ') + '</code>';
    }) + '.';
  }
}

export default ApplicationCreationController;
