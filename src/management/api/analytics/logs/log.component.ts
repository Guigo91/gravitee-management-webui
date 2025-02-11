import { StateService } from '@uirouter/core';
import NotificationService from '../../../../services/notification.service';
import { toPairs } from 'lodash';

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

interface IQueryParam {
  key: string;
  value: string;
}

class LogComponentController {
  public log: {
    clientRequest: any
    proxyRequest: any
    clientResponse: any
    proxyResponse: any
  };
  public backStateParams: {
    q: any;
    size: any;
    from: any;
    to: any;
    page: any
  };

  private static headersAsList(obj) {
    if (obj) {
      obj.headersAsList = [];
      for (const k in obj.headers) {
        if (obj.headers.hasOwnProperty(k)) {
          for (const v in obj.headers[k]) {
            if (obj.headers[k].hasOwnProperty(v)) {
              obj.headersAsList.push([k, obj.headers[k][v]]);
            }
          }
        }
      }

      (obj.headersAsList as Array<[string, string]>).sort(([key1], [key2]) => key1.localeCompare(key2));
    }
  }

  constructor(
    public readonly Constants: any,
    private readonly $state: StateService,
    private readonly NotificationService: NotificationService,
  ) {
    'ngInject';
    this.backStateParams = {
      from: $state.params.from,
      to: $state.params.to,
      q: $state.params.q,
      page: $state.params.page,
      size: $state.params.size,
    };
  }


  $onInit() {
    if (this.log.clientRequest != null) {
      LogComponentController.headersAsList(this.log.clientRequest);
      this.log.clientRequest = {
        ...this.log.clientRequest,
        queryParams: this.extractQueryParams(this.log.clientRequest.uri),
      };
    }


    if (this.log.proxyRequest != null) {
      LogComponentController.headersAsList(this.log.proxyRequest);
      this.log.proxyRequest = {
        ...this.log.proxyRequest,
        queryParams: this.extractQueryParams(this.log.proxyRequest.uri),
      };
    }

    if (this.log.clientResponse != null) {
      LogComponentController.headersAsList(this.log.clientResponse);
    }

    if (this.log.proxyResponse != null) {
      LogComponentController.headersAsList(this.log.proxyResponse);
    }

  }

  getMimeType(log): string | null {
    let contentTypes: string[] | null | undefined = log.headers != null ? log.headers['Content-Type'] : null;
    if (Array.isArray(contentTypes)) {
      return contentTypes[0].split(';', 1)[0];
    }

    return null;
  }

  /**
   * Convert an input uri (path + query params) to an array of IQueryParam
   *
   * Example:
   * `/gme?type=monthly&bucket=status_repartition&bucket=status_repartition-2`
   * -->
   * [
   *   { key: 'type', value: 'monthly'},
   *   { key: 'bucket', value: '[ status_repartition, status_repartition-2]'},
   * ]
   *
   * @param uri
   */
  extractQueryParams(uri: string): IQueryParam[] {
    if (!uri.includes('?')) {
      return [];
    }

    // Slice the interesting part of the uri and split to get all the query params
    const queryParamsMap = uri.slice(uri.indexOf('?') + 1).split('&')
      .map(queryParamsAsString => queryParamsAsString.split('='))
      // Convert in a map to group query params with the same key (it can happens when sending an array), for the example:
      // {
      //   type: ['monthly'],
      //   bucket: ['status_repartition', 'status_repartition-2'],
      // }
      .reduce((acc, [key, value]) => {
        const currentValues = acc[key] || [];
        acc[key] = [...currentValues, value];
        return acc;
      }, {} as { [key in string]: string[] });

    // Convert the map to an array and join the header values if needed
    return toPairs(queryParamsMap).map(([key, values]) => ({
      key,
      value: values.length === 1 ? values[0] : `[ ${values.join(', ')} ]`,
    }));
  }

  onCopyBodySuccess(evt) {
    this.NotificationService.show('Body has been copied to clipboard');
    evt.clearSelection();
  }
}

export const LogComponent: ng.IComponentOptions = {
  controller: LogComponentController,
  bindings: {
    log: '<',
  },
  template: require('./log.html'),
};
