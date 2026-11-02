/** Example source authored by an AI coding client, not a server-side model or page-generation endpoint. */
export function reportSource(config) {
  return `import {createRoot} from 'react-dom/client';
import {ReportView} from '@eas/report-ui';
import {query} from '@eas/platform-sdk/runtime';
import type {components} from '@eas/api-contract';
import type {ComponentProps} from 'react';
import '@eas/report-ui/style.css';
const config:components['schemas']['ReportDefinition']=${JSON.stringify(config)};
const execute:ComponentProps<typeof ReportView>['execute']=(key,filters,range,signal)=>query(key,filters,range,signal);
const root=document.getElementById('root');if(!root)throw new Error('ROOT_REQUIRED');
createRoot(root).render(<ReportView config={config} execute={execute}/>);
`;
}
export function addOrderDetails(config) {
  const next = structuredClone(config),
    base = next.queries[0].query;
  next.queries.push({
    key: 'order_details',
    query: {
      ...base,
      metrics: [],
      dimensions: ['order_id', 'order_date', 'region', 'product_name', 'amount'],
      groupBy: [],
      orderBy: [{ key: 'order_id', direction: 'asc' }],
      filters: [{ fieldKey: 'status', operator: 'eq', value: 'paid' }],
      limit: 50,
    },
  });
  next.chartDefinitions.push({
    id: 'details_table',
    title: '订单明细',
    type: 'table',
    queryKey: 'order_details',
    valueKey: 'amount',
    format: 'currency',
    span: 12,
  });
  return next;
}
