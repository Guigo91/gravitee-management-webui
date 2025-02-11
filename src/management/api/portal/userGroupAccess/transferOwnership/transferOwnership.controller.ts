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
import angular = require('angular');
import _ = require('lodash');
import ApiService from '../../../../../services/api.service';
import UserService from '../../../../../services/user.service';
import ApiPrimaryOwnerModeService from '../../../../../services/apiPrimaryOwnerMode.service';

class ApiTransferOwnershipController {
  private api: any;
  private members: any;
  private groupMembers: any;
  private groupIdsWithMembers: any;
  private roles: any;
  private newPORoles: any[];
  private newPORole: any;
  private groupById: any;
  private displayGroups: any;
  private usersSelected = [];
  private userFilterFn;
  private defaultUsersList: string[];
  private poGroups: any[];
  private newPrimaryOwnerGroup: string;
  private useGroupAsPrimaryOwner: boolean;

  constructor(
    private ApiService: ApiService,
    private ApiPrimaryOwnerModeService: ApiPrimaryOwnerModeService,
    private resolvedApi,
    private resolvedMembers,
    private resolvedGroups,
    private $state,
    private $mdDialog: ng.material.IDialogService,
    private NotificationService,
    private $scope,
    private UserService: UserService,
    private GroupService,
    private RoleService,
    private Constants
  ) {
    'ngInject';
    this.api = resolvedApi.data;
    this.poGroups = this.resolvedGroups.filter(group => group.apiPrimaryOwner != null);
    if (this.api.owner.type === 'GROUP') {
      this.poGroups = this.poGroups.filter(group => group.id !== this.api.owner.id);
    }
    this.useGroupAsPrimaryOwner = this.ApiPrimaryOwnerModeService.isGroupOnly();
    this.members = resolvedMembers.data;
    this.groupById = _.keyBy(resolvedGroups, 'id');
    this.displayGroups = {};
    _.forEach(resolvedGroups, (grp) => {
      this.displayGroups[grp.id] = false;
    });
    this.groupMembers = {};
    this.groupIdsWithMembers = [];
    if (this.api.groups) {
      let self = this;
      _.forEach(this.api.groups, (grp) => {
        GroupService.getMembers(grp).then((members) => {
          let filteredMembers = _.filter(members.data, (m: any) => {
            return m.roles.API;
          });

          if (filteredMembers.length > 0) {
            self.groupMembers[grp] = filteredMembers;
            self.groupIdsWithMembers.push(grp);
          }
        });
      });
    }

    const that = this;
    RoleService.list('API').then(function (roles) {
      that.roles = roles;
      that.newPORoles = _.filter(roles, (role: any) => {
        return role.name !== 'PRIMARY_OWNER';
      });
      that.newPORole = _.find(roles, (role: any) => {
        return role.default;
      });
    });
  }

  $onInit() {
    this.userFilterFn = (user: any) => {
      return user.id === undefined || _.findIndex(this.members,
        function (apiMember: any) {
          return apiMember.id === user.id && apiMember.role === 'PRIMARY_OWNER';
        }) === -1;
    };

    this.defaultUsersList = _.filter(this.members, (member: any) => {
      return member.role !== 'PRIMARY_OWNER' && member.type === 'USER';
    });
  }

  isPrimaryOwner() {
    return (this.api.owner.type === 'USER' && this.UserService.currentUser.id === this.api.owner.id)
      || (this.api.owner.type === 'GROUP' && this.resolvedGroups.some(group => group.id === this.api.owner.id && group.apiPrimaryOwner === this.UserService.currentUser.id));
  }

  showTransferOwnershipConfirm(ev) {
    this.$mdDialog.show({
      controller: 'DialogTransferApiController',
      controllerAs: '$ctrl',
      template: require('./transferAPI.dialog.html'),
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      locals: {
        newRole: this.newPORole
      }
    }).then((transferAPI) => {
      if (transferAPI) {
        this.transferOwnership(this.newPORole.name);
      }
    }, () => {
      // You cancelled the dialog
    });
  }

  isAllowedToTransferOwnership() {
    return this.UserService.currentUser.isAdmin() || this.isPrimaryOwner();
  }

  private transferOwnership(newRole: string) {
    let ownership;
    if (this.useGroupAsPrimaryOwner) {
      ownership = {
        id: this.newPrimaryOwnerGroup,
        reference: null,
        role: newRole,
        type: 'GROUP'
      };
    } else {
      ownership = {
        id: this.usersSelected[0].id,
        reference: this.usersSelected[0].reference,
        role: newRole,
        type: 'USER'
      };
    }
    this.ApiService.transferOwnership(this.api.id, ownership).then(() => {
      this.NotificationService.show('API ownership changed !');
      this.$state.go('management.apis.list');
    });
  }
}

export default ApiTransferOwnershipController;
