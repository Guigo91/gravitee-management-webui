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
import _ = require('lodash');
import { PagedResult } from './pagedResult';

export class User {
  public id: string;
  public username: string;
  public displayName: string;
  public email: string;
  public source: string;
  public roles: any[];
  public primaryOwner: boolean;
  public userPermissions: string[];
  public userApiPermissions: string[];
  public userEnvironmentPermissions: string[];
  public userApplicationPermissions: string[];
  public tasks: PagedResult;
  public notifications: PagedResult;
  public authenticated: boolean = false;
  public firstLogin: boolean;
  public picture: string;
  public picture_url: string;
  public number_of_active_tokens: number;
  constructor() {
    'ngInject';
    this.tasks = new PagedResult();
    this.notifications = new PagedResult();
  }

  allowedTo(permissions: string[]): boolean {
    if (!permissions || !this.userPermissions) {
      return false;
    }
    return _.intersection(this.userPermissions, permissions).length > 0 ||
      _.intersection(this.userEnvironmentPermissions, permissions).length > 0 ||
      _.intersection(this.userApiPermissions, permissions).length > 0 ||
      _.intersection(this.userApplicationPermissions, permissions).length > 0;
  }

  allowedToAnd(permissions: string[]): boolean {
    if (!permissions || !this.userPermissions) {
      return false;
    }
    return _.difference(permissions, this.userPermissions).length === 0 ||
      _.difference(permissions, this.userEnvironmentPermissions).length === 0 ||
      _.difference(permissions, this.userApiPermissions).length === 0 ||
      _.difference(permissions, this.userApplicationPermissions).length === 0;
  }

  isAdmin(): boolean {
    if (!this.userPermissions && !this.userEnvironmentPermissions) {
      return false;
    }
    return this.userEnvironmentPermissions.some((userEnvironmentPermission) => {
      return userEnvironmentPermission.startsWith('environment-instance')
        || userEnvironmentPermission.startsWith('environment-platform');
    });
  }

}
