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

import { ApiPortalHeader } from '../entities/apiPortalHeader';
import { IHttpPromise } from 'angular';

class ApiHeaderService {

  constructor(private $http, private Constants) {
    'ngInject';
  }

  list(): IHttpPromise<ApiPortalHeader[]> {
    return this.$http.get(`${this.Constants.env.baseURL}/configuration/apiheaders/`);
  }

  create(apiHeader: ApiPortalHeader): IHttpPromise<ApiPortalHeader> {
    return this.$http.post(`${this.Constants.env.baseURL}/configuration/apiheaders/`, apiHeader);
  }

  update(apiHeader: ApiPortalHeader): IHttpPromise<ApiPortalHeader> {
    return this.$http.put(`${this.Constants.env.baseURL}/configuration/apiheaders/` + apiHeader.id,
      {
        name: apiHeader.name,
        value: apiHeader.value,
        order: apiHeader.order
      });
  }

  delete(apiHeader: ApiPortalHeader): IHttpPromise<any> {
    return this.$http.delete(`${this.Constants.env.baseURL}/configuration/apiheaders/` + apiHeader.id);
  }
}

export default ApiHeaderService;
