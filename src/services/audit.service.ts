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
import * as _ from 'lodash';

export class AuditQuery {
  from: Date;
  to: Date;
  page: number;
  mgmt: boolean = false;
  api: string = null;
  application: string = null;
  event: string = null;
}

class AuditService {

  constructor(private $http, private Constants) {
    'ngInject';
  }

  list(query?: AuditQuery, api?: string) {
    let url;
    if (api) {
      url = `${this.Constants.env.baseURL}/apis/` + api + '/audit?';
    } else {
      url = `${this.Constants.env.baseURL}/audit` + '?';
    }

    _.forEach(query, (value, key) => {
      if (value !== undefined && value !== null && value !== '') {
        url += key + '=' + ((value instanceof Date) ? value.getTime() : value) + '&';
      }
    });

    return this.$http.get(url);
  }

  listEvents(api?: string) {
    let url;
    if (api) {
      url = `${this.Constants.env.baseURL}/apis/` + api + '/audit/events';
    } else {
      url = `${this.Constants.env.baseURL}/audit` + '/events';
    }

    return this.$http.get(url);
  }
}

export default AuditService;
