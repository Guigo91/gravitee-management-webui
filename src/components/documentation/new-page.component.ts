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

import NotificationService from '../../services/notification.service';
import DocumentationService, {
  DocumentationQuery,
  FolderSituation,
  Page,
  PageType,
  SystemFolderName
} from '../../services/documentation.service';
import { StateService } from '@uirouter/core';
import { IScope } from 'angular';
import _ = require('lodash');

interface IPageScope extends IScope {
  getContentMode: string;
  fetcherJsonSchema: string;
}
const NewPageComponent: ng.IComponentOptions = {
  bindings: {
    resolvedFetchers: '<',
    folders: '<',
    systemFolders: '<',
    pageResources: '<',
    categoryResources: '<',
    pagesToLink: '<'
  },
  template: require('./new-page.html'),
  controller: function (
    NotificationService: NotificationService,
    DocumentationService: DocumentationService,
    Constants,
    $state: StateService,
    $scope: IPageScope
  ) {
    'ngInject';
    this.apiId = $state.params.apiId;
    this.error = null;
    this.page = {
      name: '',
      type: $state.params.type,
      parentId: $state.params.parent
    };

    $scope.getContentMode = 'inline';

    this.codeMirrorOptions = {
      lineWrapping: true,
      lineNumbers: true,
      allowDropFileTypes: true,
      autoCloseTags: true,
      mode: 'javascript'
    };

    this.$onInit = () => {
      this.foldersById = _.keyBy(this.folders, 'id');
      this.systemFoldersById = _.keyBy(this.systemFolders, 'id');
      this.pageList = this.buildPageList(this.pageResources, true);
      this.pagesToLink = this.buildPageList(this.pagesToLink);

      this.fetchers = this.resolvedFetchers;
      if (DocumentationService.supportedTypes(this.getFolderSituation(this.page.parentId)).indexOf(this.page.type) < 0) {
        $state.go('management.settings.documentation', {parent: $state.params.parent});
      }

      const q = new DocumentationQuery();
      q.type = PageType.MARKDOWN_TEMPLATE;
      q.published = true;
      q.translated = true;
      DocumentationService.search(q, null)
        .then(response => {
          this.templates = response.data;
        });

      this.emptyFetcher = {
        'type': 'object',
        'id': 'empty',
        'properties': {'' : {}}
      };
      $scope.fetcherJsonSchema = this.emptyFetcher;
      this.fetcherJsonSchemaForm = ['*'];

      const settings = Constants.env.settings;
      if (this.page.type === 'SWAGGER' && settings && settings.openAPIDocViewer) {
        this.page.configuration = {
          viewer: settings.openAPIDocViewer.openAPIDocType.defaultType
        };
      }

    };

    this.getPageName = (): string => {
      switch (this.page.type) {
        case PageType.FOLDER:
          return 'New Folder';
        case PageType.LINK:
          return 'New Link';
        case PageType.MARKDOWN_TEMPLATE:
          return 'New Markdown Template';
        default:
          return 'New Page';
      }
    };

    this.isFolder = (): boolean => PageType.FOLDER === this.page.type;
    this.isLink = (): boolean => PageType.LINK === this.page.type;
    this.isSwagger = (): boolean => PageType.SWAGGER === this.page.type;
    this.isMarkdown = (): boolean => PageType.MARKDOWN === this.page.type;
    this.isMarkdownTemplate = (): boolean => PageType.MARKDOWN_TEMPLATE === this.page.type;

    this.buildPageList = (pagesToFilter: any[], withRootFolder?: boolean) => {
      let pageList = _
        .filter(pagesToFilter, (p) => p.type === 'MARKDOWN' || p.type === 'SWAGGER' || (p.type === 'FOLDER' && this.getFolderSituation(p.id) !== FolderSituation.FOLDER_IN_SYSTEM_FOLDER))
        .sort((a, b) => {
          let comparison = 0;
          const aFullPath = a.parentPath + '/' + a.name;
          const bFullPath = b.parentPath + '/' + b.name;
          if (aFullPath > bFullPath) {
            comparison = 1;
          } else if (aFullPath < bFullPath) {
            comparison = -1;
          }
          return comparison;
      });

      if (withRootFolder) {
        pageList.unshift({ id: 'root', name: '', type: 'FOLDER', fullPath: '' });
      }
      return pageList;
    };

    this.getFolderSituation = (folderId: string) => {
      if (!folderId) {
        return FolderSituation.ROOT;
      }
      if (this.systemFoldersById[folderId]) {
        if (SystemFolderName.TOPFOOTER === this.systemFoldersById[folderId].name) {
          return FolderSituation.SYSTEM_FOLDER_WITH_FOLDERS;
        } else {
          return FolderSituation.SYSTEM_FOLDER;
        }
      }
      if (this.foldersById[folderId]) {
        const parentFolderId = this.foldersById[folderId].parentId;
        if (this.systemFoldersById[parentFolderId]) {
          return FolderSituation.FOLDER_IN_SYSTEM_FOLDER;
        }
        return FolderSituation.FOLDER_IN_FOLDER;
      }
      // tslint:disable-next-line:no-console
      console.debug('impossible to determine folder situation : ' + folderId);
    };

    this.getFolder = (id: string) => {
      if (id) {
        let folder = this.foldersById[id];
        if (!folder) {
          folder = this.systemFoldersById[id];
        }
        return folder;
      }
    };

    this.getFolderPath = (parentFolderId: string) => {
      const parent = this.getFolder(parentFolderId);
      if (parent) {
        return this.getFolderPath(parent.parentId) + '/' + parent.name;
      } else {
        return '';
      }
    };

    this.configureFetcher = (fetcher) => {
      if (! this.page.source) {
        this.page.source = {};
      }

      this.page.source = {
        type: fetcher.id,
        configuration: {}
      };
      $scope.fetcherJsonSchema = JSON.parse(fetcher.schema);
    };

    this.checkIfFolder = () => {
      if (this.page.content) {
        if (this.page.content === 'root') {
          this.page.configuration.isFolder = true;
          this.page.configuration.inherit = 'false';
        } else {
          const folder = this.getFolder(this.page.content);
          if (folder) {
            this.page.configuration.isFolder = true;
          } else {
            this.page.configuration.isFolder = false;
          }
        }
      }
    };

    this.onChangeLinkType = () => {
      delete this.page.content;
      delete this.page.configuration.isFolder;
      if (this.page.configuration.resourceType !== 'external' && !this.page.configuration.inherit) {
        this.page.configuration.inherit = 'true';
      }
    };

    this.onChangeMarkdownTemplate = () => {
      if (this.selectedTemplate.type) {
        this.page = {...this.page, content: this.selectedTemplate.content};
      }
    };

    this.save = () => {
      this.error = null;
      DocumentationService.create(this.page, this.apiId)
        .then( (response: any) => {
          const page = response.data;
          if (page.messages && page.messages.length > 0) {
            NotificationService.showError('\'' + page.name + '\' has been created (with validation errors - check the bottom of the page for details)');
          } else {
            NotificationService.show('\'' + page.name + '\' has been created');
          }
          if (page.type === 'FOLDER') {
            this.gotoParent();
          } else {
            this.gotoEdit(page);
          }
      })
        .catch((err) => {
          this.error = { ...err.data, title: 'Sorry, unable to create page' };
        });
    };

    this.changeContentMode = (newMode) => {
      if ('fetcher' === newMode) {
        this.page.source = {
          configuration: {}
        };
      } else {
        delete this.page.source;
      }
      this.error = null;
    };

    this.cancel = () => {
      this.gotoParent();
    };

    this.gotoParent = () => {
      if (this.apiId) {
        $state.go('management.apis.detail.portal.documentation', {apiId: this.apiId, parent: $state.params.parent});
      } else {
        $state.go('management.settings.documentation', {parent: $state.params.parent});
      }
    };

    this.gotoEdit = (page) => {
      if (this.apiId) {
        $state.go('management.apis.detail.portal.editdocumentation', {apiId: this.apiId, pageId: page.id, type: page.type});
      } else {
        $state.go('management.settings.editdocumentation', {pageId: page.id, type: page.type});
      }
    };

    this.updateLinkName = (resourceName: string) => {
      if (!this.page.name || this.page.name === '' || this.page.configuration.inherit === 'true' || resourceName === '') {
        this.page.name = resourceName;
      }
    };
  }
};

export default NewPageComponent;
