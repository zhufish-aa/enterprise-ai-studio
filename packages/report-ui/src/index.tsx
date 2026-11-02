import { getRuntimeContext } from '@eas/platform-sdk/runtime';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { components } from '@eas/api-contract';
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);
type S = components['schemas'];
type Execute = (
  key: string,
  filters: S['Filter'][],
  range: S['QuerySpec']['timeRange'],
  signal: AbortSignal,
) => Promise<S['QueryResult']>;
type State = { loading: boolean; data?: S['QueryResult']; error?: string };
const palette = ['#5368e8', '#899af0', '#42a99e', '#e1ae65', '#af92d8'];
const number = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const format = (v: unknown, type: string) =>
  new Intl.NumberFormat('zh-CN', {
    ...(type === 'currency' ? { style: 'currency', currency: 'CNY' } : {}),
    maximumFractionDigits: type === 'number' ? 0 : 2,
  }).format(number(v)) + (type === 'percent' ? '%' : '');
function Chart({
  definition: c,
  data,
}: {
  definition: S['ChartDefinition'];
  data: S['QueryResult'];
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (c.type === 'metric' || c.type === 'table' || !host.current) return;
    const chart = echarts.init(host.current),
      category = data.columns.findIndex((col) => col.key === c.categoryKey),
      value = data.columns.findIndex((col) => col.key === c.valueKey),
      labels = data.rows.map((r) => String(r[category] ?? '—')),
      values = data.rows.map((r) => number(r[value]));
    const ranking = c.type === 'ranking';
    chart.setOption({
      color: palette,
      animationDuration: 300,
      tooltip: { trigger: c.type === 'pie' ? 'item' : 'axis', renderMode: 'richText' },
      grid: {
        left: ranking ? 80 : 58,
        right: ranking ? 50 : 24,
        top: 22,
        bottom: 36,
        containLabel: false,
      },
      ...(c.type === 'pie'
        ? {
            legend: { bottom: 0, icon: 'circle', textStyle: { color: '#7a8194' } },
            series: [
              {
                type: 'pie',
                radius: ['52%', '74%'],
                center: ['50%', '44%'],
                avoidLabelOverlap: true,
                itemStyle: { borderRadius: 3, borderWidth: 3, borderColor: '#fff' },
                label: { show: false },
                data: labels.map((name, i) => ({ name, value: values[i] })),
              },
            ],
          }
        : {
            xAxis: {
              type: ranking ? 'value' : 'category',
              data: ranking ? undefined : labels,
              axisLine: { show: false },
              axisTick: { show: false },
              axisLabel: {
                color: '#9299aa',
                fontSize: 11,
                formatter: (v: string) => (v.length > 10 ? v.slice(5, 10) : v),
              },
              splitLine: { show: ranking, lineStyle: { color: '#f0f2f7' } },
            },
            yAxis: {
              type: ranking ? 'category' : 'value',
              data: ranking ? labels : undefined,
              inverse: ranking,
              axisLine: { show: false },
              axisTick: { show: false },
              axisLabel: { color: '#8991a4', fontSize: 11 },
              splitLine: { show: !ranking, lineStyle: { color: '#f0f2f7' } },
            },
            series: [
              {
                type: c.type === 'line' ? 'line' : 'bar',
                data: values,
                smooth: 0.3,
                symbolSize: 5,
                showSymbol: values.length < 15,
                lineStyle: { width: 3 },
                areaStyle: c.type === 'line' ? { color: 'rgba(83,104,232,0.06)' } : undefined,
                barMaxWidth: 26,
                itemStyle: { borderRadius: ranking ? [0, 4, 4, 0] : [4, 4, 0, 0] },
                label: ranking
                  ? { show: true, position: 'right', color: '#646e86', fontSize: 11 }
                  : undefined,
              },
            ],
          }),
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [c, data]);
  if (c.type === 'metric') {
    const index = data.columns.findIndex((col) => col.key === c.valueKey);
    return (
      <div className="report-metric-value">
        {format(data.rows[0]?.[index], c.format)}
        <small>当前筛选范围 · 已授权数据</small>
      </div>
    );
  }
  if (c.type === 'table')
    return (
      <div className="report-table-scroll">
        <table>
          <thead>
            <tr>
              {data.columns.map((c) => (
                <th key={c.key}>{c.key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 100).map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j}>{String(v ?? '—')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.truncated && <p>结果已达到查询上限，请缩小筛选范围。</p>}
      </div>
    );
  return (
    <div
      ref={host}
      className="report-echart"
      role="img"
      aria-label={c.title + '，' + data.rows.length + '组实际查询数据'}
    />
  );
}
export function ReportView({
  config,
  execute,
}: {
  config: S['ReportDefinition'];
  execute: Execute;
}) {
  const environment = getRuntimeContext()?.environment,
    environmentLabel =
      environment === 'production' ? 'PROD' : environment === 'test' ? 'TEST' : '授权数据';
  const initial = config.queries.find((q) => q.query.timeRange)?.query.timeRange;
  const [from, setFrom] = useState(initial?.from.slice(0, 10) ?? ''),
    [to, setTo] = useState(
      initial?.to ? new Date(Date.parse(initial.to) - 86400000).toISOString().slice(0, 10) : '',
    ),
    [region, setRegion] = useState(''),
    [refresh, setRefresh] = useState(0),
    [states, setStates] = useState<Record<string, State>>({});
  const selector = config.filters.find((f) => f.type === 'select'),
    range =
      initial && from && to
        ? {
            fieldKey: initial.fieldKey,
            from: from + 'T00:00:00Z',
            to: new Date(Date.parse(to + 'T00:00:00Z') + 86400000).toISOString(),
          }
        : undefined;
  useEffect(() => {
    const abort = new AbortController();
    setStates(Object.fromEntries(config.queries.map((q) => [q.key, { loading: true }])));
    void (async () => {
      for (const q of config.queries) {
        if (abort.signal.aborted) return;
        try {
          const filters: S['Filter'][] =
            selector && region
              ? [{ fieldKey: selector.fieldKey, operator: 'eq', value: region }]
              : [];
          const data = await execute(
            q.key,
            filters,
            q.query.timeRange ? range : undefined,
            abort.signal,
          );
          if (!abort.signal.aborted)
            setStates((current) => ({ ...current, [q.key]: { loading: false, data } }));
        } catch (e) {
          if (!abort.signal.aborted)
            setStates((current) => ({
              ...current,
              [q.key]: { loading: false, error: e instanceof Error ? e.message : 'QUERY_FAILED' },
            }));
        }
      }
    })();
    return () => abort.abort();
  }, [config, execute, from, to, region, refresh]);
  useEffect(() => {
    if (config.refreshPolicy.mode !== 'interval') return;
    const timer = setInterval(
      () => setRefresh((v) => v + 1),
      Math.max(60, config.refreshPolicy.intervalSeconds) * 1000,
    );
    return () => clearInterval(timer);
  }, [config.refreshPolicy]);
  const invalidRange = !!from && !!to && from > to;
  return (
    <div className={'report-view ' + config.theme}>
      <header className="report-heading">
        <div>
          <span className="report-overline">BUSINESS INTELLIGENCE / {environmentLabel}</span>
          <h1>{config.title}</h1>
          <p>以统一业务口径，洞察每一次增长。</p>
        </div>
        <span className="report-live">
          <i />
          {environment === 'production'
            ? '正式运行查询'
            : environment === 'test'
              ? '实时测试查询'
              : '实时授权查询'}
        </span>
      </header>
      <div className="report-controls">
        <div className="report-period">
          <span>统计周期</span>
          <input
            type="date"
            aria-label="开始日期"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span>—</span>
          <input
            type="date"
            aria-label="结束日期"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        {selector && (
          <label className="report-region">
            {selector.label}
            <select
              aria-label={selector.label}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">全部授权区域</option>
              {selector.options.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        )}
        <button onClick={() => setRefresh((v) => v + 1)}>刷新数据 ↻</button>
      </div>
      {invalidRange ? (
        <p role="alert">开始日期不能晚于结束日期。</p>
      ) : (
        <div className="report-grid" style={{ gap: config.layout.gap }}>
          {config.chartDefinitions.map((c) => {
            const state = states[c.queryKey];
            return (
              <section
                className={'report-card report-card-' + c.type}
                style={{ '--span': c.span } as CSSProperties}
                key={c.id}
              >
                <header>
                  <h2>{c.title}</h2>
                  <span>{c.type === 'metric' ? '指标' : environmentLabel}</span>
                </header>
                {!state || state.loading ? (
                  <div className="report-state">
                    <i className="report-spinner" />
                    正在获取授权数据
                  </div>
                ) : state.error ? (
                  <div className="report-state report-error" role="alert">
                    <strong>暂时无法加载</strong>
                    <code>{state.error}</code>
                    <button onClick={() => setRefresh((v) => v + 1)}>重新查询</button>
                  </div>
                ) : !state.data?.rows.length ? (
                  <div className="report-state">当前条件下暂无数据</div>
                ) : (
                  <Chart definition={c} data={state.data} />
                )}
              </section>
            );
          })}
        </div>
      )}
      <footer className="report-footnote">
        <span>数据通过企业安全查询网关获取 · 权限以当前访问用户为准</span>
        <span>
          {config.queries.length} 项查询 · Schema {config.schemaVersion}
        </span>
      </footer>
      {config.notes.length > 0 && (
        <details className="report-notes">
          <summary>统计口径与限制</summary>
          {config.notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </details>
      )}
    </div>
  );
}
