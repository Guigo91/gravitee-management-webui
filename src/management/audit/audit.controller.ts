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
import ApiService from '../../services/api.service';
import ApplicationService from '../../services/application.service';

class AuditController {
  constructor(
    private ApiService: ApiService,
    private ApplicationService: ApplicationService,
    private resolvedEvents: string[],
    private $scope
  ) {
    'ngInject';
    this.$scope.events = resolvedEvents;
  }

  $onInit() {
    this.ApiService.list().then(response => this.$scope.apis = response.data );
    this.ApplicationService.list().then(response => this.$scope.applications = response.data );
  }
}
export default AuditController;
