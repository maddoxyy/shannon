(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

  const number = new Intl.NumberFormat('pt-BR');
  const percent = (value, total) => Math.max(0, Math.min(100, Math.round((value / total) * 100)));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function moneyBi(value) {
    return `$ ${number.format(value / 1e9)} BI`;
  }

  function compactNumber(value) {
    const abs = Math.abs(value);
    const format = (amount, suffix) => {
      const hasDecimal = !Number.isInteger(amount);
      return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: hasDecimal ? 1 : 0 }).format(amount)}${suffix}`;
    };

    if (abs >= 1e9) return format(value / 1e9, ' BI');
    if (abs >= 1e6) return format(value / 1e6, ' MI');
    if (abs >= 1e3) return format(value / 1e3, 'K');
    return number.format(value);
  }

  function gpuHours(value) {
    return `${compactNumber(value)} GPU-h`;
  }

  const capacityModel = Object.freeze({
    gpuEquivalent: 200000,
    moduleGpuEquivalent: 5000,
    monthlyHours: 24 * 30,
    inUseRatio: 0.6,
    reservedRatio: 0.2,
    availableRatio: 0.2,
    h100PowerW: 700,
    operationalPowerFactor: 1.5,
    monthlyCommitUsd: 5e9,
    colossusReferenceUsd: 10e9,
    additionalCapacityUsd: 2e9
  });

  const capacityDerived = Object.freeze({
    monthlyGpuHours: capacityModel.gpuEquivalent * capacityModel.monthlyHours,
    usedGpuHours: capacityModel.gpuEquivalent * capacityModel.monthlyHours * capacityModel.inUseRatio,
    reservedGpuHours: capacityModel.gpuEquivalent * capacityModel.monthlyHours * capacityModel.reservedRatio,
    availableGpuHours: capacityModel.gpuEquivalent * capacityModel.monthlyHours * capacityModel.availableRatio,
    additionalGpuHours: capacityModel.gpuEquivalent * capacityModel.monthlyHours * (capacityModel.additionalCapacityUsd / capacityModel.monthlyCommitUsd),
    contractedModules: capacityModel.gpuEquivalent / capacityModel.moduleGpuEquivalent,
    modulesInUse: capacityModel.gpuEquivalent * capacityModel.inUseRatio / capacityModel.moduleGpuEquivalent,
    modulesReserved: capacityModel.gpuEquivalent * capacityModel.reservedRatio / capacityModel.moduleGpuEquivalent,
    modulesAvailable: capacityModel.gpuEquivalent * capacityModel.availableRatio / capacityModel.moduleGpuEquivalent,
    gpuOnlyMw: capacityModel.gpuEquivalent * capacityModel.h100PowerW / 1e6,
    energyEnvelopeMw: capacityModel.gpuEquivalent * capacityModel.h100PowerW * capacityModel.operationalPowerFactor / 1e6,
    energyInUseMw: capacityModel.gpuEquivalent * capacityModel.h100PowerW * capacityModel.operationalPowerFactor * capacityModel.inUseRatio / 1e6,
    energyReservedMw: capacityModel.gpuEquivalent * capacityModel.h100PowerW * capacityModel.operationalPowerFactor * capacityModel.reservedRatio / 1e6,
    energyAvailableMw: capacityModel.gpuEquivalent * capacityModel.h100PowerW * capacityModel.operationalPowerFactor * capacityModel.availableRatio / 1e6,
    modulePowerMw: capacityModel.moduleGpuEquivalent * capacityModel.h100PowerW * capacityModel.operationalPowerFactor / 1e6
  });

  const cycleAllocation = Object.freeze([
    ['Pré-processamento', 34.4e6],
    ['Inferência em lote', 30e6],
    ['Job longo de IA', 22e6],
    ['Geração sintética', 18e6],
    ['Avaliação de modelo', 10.8e6],
    ['Livre no plano', capacityDerived.availableGpuHours]
  ]);

  const state = {
    activeView: 'overview',
    selectedWorkload: null,
    requests: [],
    filters: {
      query: '',
      status: 'all'
    },
    contract: {
      client: 'Claude',
      plan: 'Dedicated Orbital Capacity',
      financialPlan: 'Shannon Dedicated Orbit Pro',
      orbit: 'CLAUDE-1 · órbita de processamento dedicada',
      review: 'Revisão trimestral Q3',
      term: 'Ciclo piloto 2026',
      owner: 'Shannon Enterprise Operations',
      monthlyCommitUsd: capacityModel.monthlyCommitUsd,
      colossusReferenceUsd: capacityModel.colossusReferenceUsd,
      dedicatedGpuEquivalent: capacityModel.gpuEquivalent,
      includedGpuHours: capacityDerived.monthlyGpuHours,
      overageUnit: '+57,6 MI GPU-h / mês sob cotação',
      addOnPolicy: 'Nova demanda acima do contrato exige solicitação de capacidade computacional adicional.',
      disclaimer: 'Console conceitual com dados simulados. Não representa parceria real Claude x Shannon.'
    },
    capacity: {
      contracted: capacityDerived.monthlyGpuHours,
      used: capacityDerived.usedGpuHours,
      reserved: capacityDerived.reservedGpuHours,
      available: capacityDerived.availableGpuHours,
      peak24h: 74,
      activeWorkloads: 42,
      queuedWorkloads: 13,
      sla: '99.2%',
      nextReview: 'Revisão Q3'
    },
    constellation: {
      contractedModules: capacityDerived.contractedModules,
      modulesInUse: capacityDerived.modulesInUse,
      modulesReserved: capacityDerived.modulesReserved,
      modulesAvailable: capacityDerived.modulesAvailable,
      alertModules: 1,
      moduleGpuEquivalent: capacityModel.moduleGpuEquivalent,
      h100PowerW: capacityModel.h100PowerW,
      operationalFactor: capacityModel.operationalPowerFactor,
      gpuOnlyMw: capacityDerived.gpuOnlyMw,
      energyEnvelopeMw: capacityDerived.energyEnvelopeMw,
      energyInUseMw: capacityDerived.energyInUseMw,
      energyReservedMw: capacityDerived.energyReservedMw,
      energyAvailableMw: capacityDerived.energyAvailableMw,
      modulePowerMw: capacityDerived.modulePowerMw,
      avgTempC: 41,
      communication: 'Nominal',
      availability: '99.2%',
      lastSync: '18:42:16 UTC',
      dedicatedOrbit: 'CLAUDE-1',
      isolation: 'Capacidade lógica dedicada ao contrato Claude'
    },
    workloads: [
      {
        id: 'CLD-101',
        name: 'Frontier Batch Inference',
        type: 'Inferência em lote',
        status: 'Em execução',
        capacityUse: 30e6,
        eta: '2h 10m',
        priority: 'Alta',
        result: 'Resultados parciais em entrega',
        owner: 'Claude inference',
        region: 'Órbita dedicada CLAUDE-1',
        notes: 'Carga em lote do contrato Claude. A Shannon gerencia escalonamento, energia, janela dedicada e entrega dos resultados simulados.'
      },
      {
        id: 'CLD-102',
        name: 'Constitutional Eval Sweep',
        type: 'Avaliação de modelo',
        status: 'Programado',
        capacityUse: 10.8e6,
        eta: '6h 40m',
        priority: 'Normal',
        result: 'Aguardando slot dedicado',
        owner: 'Safety evaluation',
        region: 'Órbita dedicada CLAUDE-1',
        notes: 'Suite de verificação programada para janela operacional simulada com baixa urgência.'
      },
      {
        id: 'CLD-103',
        name: 'Training Data Preprocess',
        type: 'Pré-processamento de dados',
        status: 'Em execução',
        capacityUse: 34.4e6,
        eta: '1h 25m',
        priority: 'Alta',
        result: '62% concluído',
        owner: 'Data platform',
        region: 'Órbita dedicada CLAUDE-1',
        notes: 'Pré-processamento pesado sem requisito de baixa latência. Resultados são entregues via fluxo simulado.'
      },
      {
        id: 'CLD-104',
        name: 'Synthetic Dialogue Generation',
        type: 'Geração sintética',
        status: 'Na fila',
        capacityUse: 18e6,
        eta: 'Aguardando capacidade',
        priority: 'Normal',
        result: 'Fila limitada pelo plano atual',
        owner: 'Data generation',
        region: 'Órbita dedicada CLAUDE-1',
        notes: 'Fila controlada conforme capacidade contratada. Antecipação exige compra de GPU-h adicional.'
      },
      {
        id: 'CLD-105',
        name: 'Orbital Earth Data Analysis',
        type: 'Análise de dados orbitais',
        status: 'Concluído',
        capacityUse: 4e6,
        eta: 'Finalizado',
        priority: 'Baixa',
        result: 'Pacote de relatório entregue',
        owner: 'Research operations',
        region: 'Órbita dedicada CLAUDE-1',
        notes: 'Processamento concluído com pacote de resultado fictício.'
      },
      {
        id: 'CLD-106',
        name: 'Long Context Reliability Run',
        type: 'Job longo de IA',
        status: 'Em revisão',
        capacityUse: 22e6,
        eta: 'Revisão operacional',
        priority: 'Crítica',
        result: 'Revisão térmica solicitada',
        owner: 'Reliability lab',
        region: 'Órbita dedicada CLAUDE-1',
        notes: 'Carga longa aguardando revisão operacional simulada antes de continuar a alocação.'
      }
    ],
    alerts: [
      {
        level: 'Atenção',
        title: 'Uso contratual em 60%',
        detail: '20% do contrato segue reservado e 20% livre; adicional só entra se a fila consumir a folga.'
      },
      {
        level: 'Monitorar',
        title: 'Um módulo dedicado em revisão térmica',
        detail: 'Está dentro dos 24 módulos em uso; não altera a cota mensal nem o envelope de 126 MW em uso.'
      },
      {
        level: 'Informação',
        title: 'Workload CLD-104 aguardando capacidade',
        detail: 'Usa 18 MI GPU-h da reserva de 28,8 MI; antecipação só faz sentido se a prioridade subir.'
      }
    ],
    value: {
      monthlyCommitUsd: capacityModel.monthlyCommitUsd,
      additionalCapacityUsd: capacityModel.additionalCapacityUsd,
      projectedOverageGpuH: capacityDerived.additionalGpuHours,
      allocation: cycleAllocation
    }
  };

  const views = {
    overview: {
      title: 'Visão geral',
      label: 'Portal enterprise',
      sub: 'Contrato simulado, uso atual e próximas ações operacionais.'
    },
    capacity: {
      title: 'Capacidade',
      label: 'Uso contratado',
      sub: 'Capacidade computacional contratada, em uso, reservada e disponível.'
    },
    constellation: {
      title: 'Órbita dedicada',
      label: 'Operação gerenciada',
      sub: 'Saúde simulada dos módulos dedicados operados pela Shannon.'
    },
    workloads: {
      title: 'Workloads',
      label: 'Execução gerenciada',
      sub: 'Cargas Claude acompanhadas pelo portal, sem criação manual de jobs.'
    },
    value: {
      title: 'Financeiro',
      label: 'Plano contratado',
      sub: 'Plano financeiro simulado, consumo, adicional e valor operacional.'
    },
    support: {
      title: 'Suporte',
      label: 'Atendimento enterprise',
      sub: 'Alertas e solicitação simulada de capacidade adicional.'
    }
  };

  const statusTone = {
    'Em execução': 'good',
    'Na fila': 'neutral',
    'Programado': 'neutral',
    'Concluído': 'done',
    'Em revisão': 'warn'
  };

  function getViewFromHash() {
    const key = (window.location.hash || '#overview').slice(1);
    return views[key] ? key : 'overview';
  }

  function setView(view, shouldFocus) {
    state.activeView = view;

    $$('.view').forEach((section) => {
      section.hidden = section.dataset.view !== view;
    });

    $$('.nav a').forEach((link) => {
      if (link.dataset.view === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    const title = $('view-title');
    if (title) title.textContent = views[view].title;
    document.title = `Shannon — ${views[view].title}`;

    if (shouldFocus) $('main-region').focus({ preventScroll: true });
  }

  function metricCard(label, value, detail, tone = 'neutral') {
    return `
      <article class="metric-card" data-tone="${tone}">
        <span>${esc(label)}</span>
        <strong class="metric-value">${formatMetricValue(value)}</strong>
        <small>${esc(detail)}</small>
      </article>
    `;
  }

  function formatMetricValue(value) {
    const text = String(value);
    const match = text.match(/^(.+)\s([A-Za-zÀ-ÿ$][A-Za-zÀ-ÿ0-9$/%-]*)$/);
    if (!match) return `<span class="metric-number">${esc(text)}</span>`;

    return `
      <span class="metric-number">${esc(match[1])}</span>
      <span class="metric-unit">${esc(match[2])}</span>
    `;
  }

  function statusBadge(status) {
    return `<span class="status" data-tone="${statusTone[status] || 'neutral'}">${esc(status)}</span>`;
  }

  function bar(label, value, total, detail, tone = 'neutral') {
    const pct = percent(value, total);
    return `
      <div class="bar-row" data-tone="${tone}">
        <div class="bar-copy">
          <strong>${esc(label)}</strong>
          <span>${esc(detail)}</span>
        </div>
        <div class="bar-meter" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <b>${pct}%</b>
      </div>
    `;
  }

  function renderOverview() {
    const c = state.capacity;
    $('overview-kpis').innerHTML = [
      metricCard('Capacidade contratada', gpuHours(c.contracted), `${compactNumber(state.contract.dedicatedGpuEquivalent)} GPU-eq`, 'neutral'),
      metricCard('Uso atual', `${percent(c.used, c.contracted)}%`, `${gpuHours(c.used)} em uso`, 'good'),
      metricCard('Disponível', gpuHours(c.available), 'Livre antes de comprar adicional', 'neutral'),
      metricCard('Vantagem comercial', '2x', `${moneyBi(state.contract.monthlyCommitUsd)} vs ${moneyBi(state.contract.colossusReferenceUsd)}`, 'good')
    ].join('');

    $('overview-contract').innerHTML = `
      <header class="panel-head">
        <h2>Contrato Claude x Shannon</h2>
      </header>
      <div class="panel-body">
        <dl class="detail-list">
          <div><dt>Cliente</dt><dd>${esc(state.contract.client)}</dd></div>
          <div><dt>Plano</dt><dd>${esc(state.contract.plan)}</dd></div>
          <div><dt>Órbita</dt><dd>${esc(state.contract.orbit)}</dd></div>
          <div><dt>Financeiro</dt><dd>${esc(state.contract.financialPlan)} · ${moneyBi(state.contract.monthlyCommitUsd)}/mês</dd></div>
          <div><dt>Benchmark</dt><dd>2x mais barato que a referência Colossus simulada de ${moneyBi(state.contract.colossusReferenceUsd)}</dd></div>
          <div><dt>Período</dt><dd>${esc(state.contract.term)}</dd></div>
        </dl>
        <p class="panel-note">${esc(state.contract.disclaimer)}</p>
      </div>
    `;

    $('overview-capacity').innerHTML = `
      <header class="panel-head">
        <h2>Uso de capacidade</h2>
        <span>${esc(c.nextReview)}</span>
      </header>
      <div class="panel-body">
        <div class="stacked-bar" aria-label="Distribuição de capacidade">
          <i class="used" style="width:${percent(c.used, c.contracted)}%"></i>
          <i class="reserved" style="width:${percent(c.reserved, c.contracted)}%"></i>
          <i class="available" style="width:${percent(c.available, c.contracted)}%"></i>
        </div>
        <div class="legend">
          <span><i class="used"></i>Em uso</span>
          <span><i class="reserved"></i>Reservada</span>
          <span><i class="available"></i>Disponível</span>
        </div>
        <dl class="compact-list">
          <div><dt>Workloads ativos</dt><dd>${number.format(c.activeWorkloads)}</dd></div>
          <div><dt>Na fila</dt><dd>${number.format(c.queuedWorkloads)}</dd></div>
          <div><dt>Pico 24h</dt><dd>${c.peak24h}%</dd></div>
        </dl>
      </div>
    `;

    $('overview-alerts').innerHTML = `
      <header class="panel-head">
        <h2>Alertas importantes</h2>
        <a href="#support">Ver suporte</a>
      </header>
      <div class="panel-body">
        ${renderAlertList(state.alerts.slice(0, 3))}
      </div>
    `;

    $('overview-review').innerHTML = `
      <header class="panel-head">
        <h2>Próxima revisão</h2>
        <span>${esc(c.nextReview)}</span>
      </header>
      <div class="panel-body review-panel">
        <strong>Adicionar só se a fila consumir os ${gpuHours(c.available)} livres</strong>
        <p>O contrato está em 60% de uso, 20% reservado e 20% livre. Compra extra só se a próxima janela passar dessa folga.</p>
        <a class="secondary-action" href="#support">Abrir solicitação</a>
      </div>
    `;
  }

  function renderCapacity() {
    const c = state.capacity;
    $('capacity-summary').innerHTML = [
      metricCard('Contratada', gpuHours(c.contracted), `${compactNumber(state.contract.dedicatedGpuEquivalent)} GPU-eq mensal`),
      metricCard('Em uso', gpuHours(c.used), `${percent(c.used, c.contracted)}% da cota`, 'good'),
      metricCard('Reservada', gpuHours(c.reserved), 'Alocada em ciclos futuros'),
      metricCard('Disponível', gpuHours(c.available), 'Antes de comprar adicional')
    ].join('');

    $('capacity-bars').innerHTML = [
      bar('Em uso agora', c.used, c.contracted, `${gpuHours(c.used)} de ${gpuHours(c.contracted)}`, 'good'),
      bar('Reservada', c.reserved, c.contracted, `${gpuHours(c.reserved)} em agenda operacional`, 'neutral'),
      bar('Disponível', c.available, c.contracted, `${gpuHours(c.available)} livres no plano`, 'neutral'),
      bar('Pico recente', c.peak24h, 100, 'Maior uso nas últimas 24h', 'warn')
    ].join('');

    $('capacity-queue').innerHTML = `
      <dl class="detail-list">
        <div><dt>Workloads ativos</dt><dd>${number.format(c.activeWorkloads)}</dd></div>
        <div><dt>Fila aguardando slot</dt><dd>${number.format(c.queuedWorkloads)}</dd></div>
        <div><dt>Capacidade média por carga ativa</dt><dd>${gpuHours(Math.round(c.used / c.activeWorkloads))}</dd></div>
        <div><dt>Regra comercial</dt><dd>${esc(state.contract.addOnPolicy)}</dd></div>
      </dl>
      <p class="panel-note">A Claude não comanda hardware pelo portal. O console mostra acompanhamento executivo, uso contratual e solicitação de compra de capacidade computacional adicional.</p>
    `;
  }

  function renderConstellation() {
    const c = state.constellation;
    $('constellation-summary').innerHTML = [
      metricCard('Órbita dedicada', c.dedicatedOrbit, `${compactNumber(state.contract.dedicatedGpuEquivalent)} GPU-eq contratados`, 'good'),
      metricCard('Módulos em uso', String(c.modulesInUse), `${c.alertModules} em revisão, sem perda de cota`, 'good'),
      metricCard('Módulos livres', String(c.modulesAvailable), `${c.modulesReserved} reservados para agenda`, 'neutral'),
      metricCard('Energia em uso', `${number.format(c.energyInUseMw)} MW`, `${number.format(c.energyEnvelopeMw)} MW de envelope`, 'good')
    ].join('');

    $('constellation-modules').innerHTML = `
      <div class="module-map" aria-hidden="true">
        ${Array.from({ length: c.contractedModules }, (_, index) => {
          const activeHealthy = Math.max(0, c.modulesInUse - c.alertModules);
          const tone = index < activeHealthy ? 'active'
            : index < c.modulesInUse ? 'alert'
              : 'standby';
          return `<i data-tone="${tone}"></i>`;
        }).join('')}
      </div>
      <dl class="detail-list">
        <div><dt>Dedicada</dt><dd>${esc(c.dedicatedOrbit)}</dd></div>
        <div><dt>Contrato</dt><dd>${c.contractedModules} módulos · ${compactNumber(state.contract.dedicatedGpuEquivalent)} GPU-eq</dd></div>
        <div><dt>Em uso</dt><dd>${c.modulesInUse} módulos · ${number.format(c.energyInUseMw)} MW</dd></div>
        <div><dt>Reservados</dt><dd>${c.modulesReserved} módulos · ${number.format(c.energyReservedMw)} MW</dd></div>
        <div><dt>Livres</dt><dd>${c.modulesAvailable} módulos · ${number.format(c.energyAvailableMw)} MW</dd></div>
        <div><dt>Em revisão</dt><dd>${c.alertModules} módulo dentro dos ${c.modulesInUse} em uso</dd></div>
        <div><dt>Potência por módulo</dt><dd>${number.format(c.modulePowerMw)} MW operacionais</dd></div>
        <div><dt>Isolamento</dt><dd>${esc(c.isolation)}</dd></div>
      </dl>
    `;

    $('constellation-health').innerHTML = `
      <dl class="detail-list">
        <div><dt>Comunicação</dt><dd>${esc(c.communication)}</dd></div>
        <div><dt>Temperatura média</dt><dd>${c.avgTempC}C</dd></div>
        <div><dt>Disponibilidade</dt><dd>${esc(c.availability)}</dd></div>
        <div><dt>Potência GPU</dt><dd>${number.format(c.gpuOnlyMw)} MW @ ${number.format(c.h100PowerW)}W/GPU-eq</dd></div>
        <div><dt>Envelope energia</dt><dd>${number.format(c.energyEnvelopeMw)} MW com fator operacional ${String(c.operationalFactor).replace('.', ',')}x</dd></div>
        <div><dt>Energia alocada</dt><dd>${number.format(c.energyInUseMw)} MW em uso · ${number.format(c.energyReservedMw)} MW reservados · ${number.format(c.energyAvailableMw)} MW livres</dd></div>
        <div><dt>Última sincronização</dt><dd>${esc(c.lastSync)}</dd></div>
        <div><dt>Controle operacional</dt><dd>Somente Shannon</dd></div>
      </dl>
      <p class="panel-note">A órbita descrita é fictícia e exclusiva para a simulação do contrato Claude. O MVP não controla satélites reais.</p>
    `;
  }

  function filteredWorkloads() {
    const query = state.filters.query.trim().toLowerCase();
    return state.workloads.filter((item) => {
      const matchesStatus = state.filters.status === 'all' || item.status === state.filters.status;
      const matchesQuery = !query || [item.name, item.type, item.result, item.owner, item.region]
        .some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }

  function renderWorkloads() {
    const rows = filteredWorkloads();
    $('workload-count').textContent = `${rows.length} exemplos · ${number.format(state.capacity.activeWorkloads)} ativos · ${number.format(state.capacity.queuedWorkloads)} na fila`;
    $('workload-empty').hidden = rows.length > 0;
    document.querySelector('.workload-table').hidden = rows.length === 0;

    $('workload-body').innerHTML = rows.map((item) => `
      <tr tabindex="0" role="button" data-id="${esc(item.id)}" aria-label="Abrir detalhe de ${esc(item.name)}">
        <td data-label="Workload">
          <strong>${esc(item.name)}</strong>
          <small>${esc(item.id)} · ${esc(item.owner)}</small>
        </td>
        <td data-label="Tipo">${esc(item.type)}</td>
        <td data-label="Status">${statusBadge(item.status)}</td>
        <td data-label="Uso">${gpuHours(item.capacityUse)}</td>
        <td data-label="ETA">${esc(item.eta)}</td>
        <td data-label="Prioridade">${esc(item.priority)}</td>
        <td data-label="Resultado">${esc(item.result)}</td>
      </tr>
    `).join('');
  }

  function renderValue() {
    const v = state.value;
    $('value-kpis').innerHTML = [
      metricCard('Mensalidade base', moneyBi(v.monthlyCommitUsd), state.contract.financialPlan, 'good'),
      metricCard('Capacidade mensal', gpuHours(state.contract.includedGpuHours), `${compactNumber(state.contract.dedicatedGpuEquivalent)} GPU-eq`, 'good'),
      metricCard('Adicional previsto', moneyBi(v.additionalCapacityUsd), `${gpuHours(v.projectedOverageGpuH)} fora da cota`),
      metricCard('Vantagem vs Colossus', '2x', `${moneyBi(state.contract.colossusReferenceUsd)} referência simulada`, 'good')
    ].join('');

    $('value-panels').innerHTML = `
      <article class="panel">
        <header class="panel-head">
          <h2>Plano financeiro</h2>
        </header>
        <div class="panel-body">
          <dl class="detail-list">
            <div><dt>Plano</dt><dd>${esc(state.contract.financialPlan)}</dd></div>
            <div><dt>Compromisso mensal</dt><dd>${moneyBi(state.contract.monthlyCommitUsd)}</dd></div>
            <div><dt>Referência Colossus</dt><dd>${moneyBi(state.contract.colossusReferenceUsd)} para capacidade equivalente simulada</dd></div>
            <div><dt>Inclui</dt><dd>${gpuHours(state.contract.includedGpuHours)} / mês na órbita dedicada</dd></div>
            <div><dt>Equivalência</dt><dd>${compactNumber(state.contract.dedicatedGpuEquivalent)} GPU-eq contratados</dd></div>
            <div><dt>Capacidade extra</dt><dd>+${gpuHours(v.projectedOverageGpuH)} / mês por ${moneyBi(v.additionalCapacityUsd)}</dd></div>
            <div><dt>Regra</dt><dd>${esc(state.contract.addOnPolicy)}</dd></div>
          </dl>
        </div>
      </article>
      <article class="panel">
        <header class="panel-head">
          <h2>Alocação do ciclo</h2>
        </header>
        <div class="panel-body">
          ${v.allocation.map(([name, amount]) => bar(
            name,
            amount,
            state.capacity.contracted,
            `${gpuHours(amount)} · ${percent(amount, state.capacity.contracted)}% do contrato`
          )).join('')}
        </div>
      </article>
    `;
  }

  function renderAlertList(alerts) {
    if (!alerts.length) return '<p class="empty-state">Nenhum alerta operacional aberto.</p>';
    return `
      <ul class="alert-list">
        ${alerts.map((alert) => `
          <li data-level="${esc(alert.level)}">
            <span>${esc(alert.level)}</span>
            <div>
              <strong>${esc(alert.title)}</strong>
              <p>${esc(alert.detail)}</p>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function renderSupport() {
    const requestCount = state.requests.length;
    $('alerts-list').innerHTML = `
      ${renderAlertList(state.alerts)}
      <div class="request-count">
        <strong>${number.format(requestCount)}</strong>
        <span>compra registrada nesta sessão</span>
      </div>
    `;
  }

  function renderAll() {
    renderOverview();
    renderCapacity();
    renderConstellation();
    renderWorkloads();
    renderValue();
    renderSupport();
  }

  function openDrawer(id) {
    const item = state.workloads.find((workload) => workload.id === id);
    if (!item) return;

    state.selectedWorkload = id;
    $('drawer-kicker').textContent = `${item.id} · ${item.type}`;
    $('drawer-title').textContent = item.name;
    $('drawer-body').innerHTML = `
      <div class="drawer-status">
        ${statusBadge(item.status)}
        <span>${esc(item.priority)}</span>
      </div>
      <dl class="detail-list">
        <div><dt>Uso de capacidade</dt><dd>${gpuHours(item.capacityUse)}</dd></div>
        <div><dt>ETA</dt><dd>${esc(item.eta)}</dd></div>
        <div><dt>Resultado</dt><dd>${esc(item.result)}</dd></div>
        <div><dt>Responsável interno</dt><dd>${esc(item.owner)}</dd></div>
        <div><dt>Pool operacional</dt><dd>${esc(item.region)}</dd></div>
        <div><dt>Regra comercial</dt><dd>${esc(state.contract.addOnPolicy)}</dd></div>
      </dl>
      <p class="panel-note">${esc(item.notes)}</p>
    `;

    const drawer = $('drawer');
    const scrim = $('drawer-scrim');
    drawer.hidden = false;
    scrim.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => drawer.classList.add('open'));
    $('drawer-close').focus();
  }

  function closeDrawer() {
    const drawer = $('drawer');
    const scrim = $('drawer-scrim');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');

    const hide = () => {
      drawer.hidden = true;
      scrim.hidden = true;
    };

    if (reducedMotion) hide();
    else window.setTimeout(hide, 180);
  }

  function handleSupportSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = $$('input, select, textarea', form);
    fields.forEach((field) => field.classList.toggle('invalid', !field.checkValidity()));

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const request = {
      id: `REQ-${String(state.requests.length + 1).padStart(3, '0')}`,
      type: $('request-type').value,
      reason: $('request-reason').value,
      capacity: $('request-capacity').value.trim(),
      priority: $('request-priority').value,
      message: $('request-message').value.trim()
    };

    state.requests.push(request);
    form.reset();
    fields.forEach((field) => field.classList.remove('invalid'));
    $('request-result').textContent = `${request.id} registrada localmente para revisão da Shannon. Nenhum dado foi enviado a um servidor.`;
    renderSupport();
    showToast('Solicitação registrada (local).');
  }

  let toastTimer;
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function bindEvents() {
    window.addEventListener('hashchange', () => setView(getViewFromHash(), true));

    $('workload-search').addEventListener('input', (event) => {
      state.filters.query = event.target.value;
      renderWorkloads();
    });

    $('workload-status').addEventListener('change', (event) => {
      state.filters.status = event.target.value;
      renderWorkloads();
    });

    $('workload-body').addEventListener('click', (event) => {
      const row = event.target.closest('tr[data-id]');
      if (row) openDrawer(row.dataset.id);
    });

    $('workload-body').addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('tr[data-id]');
      if (!row) return;
      event.preventDefault();
      openDrawer(row.dataset.id);
    });

    $('drawer-close').addEventListener('click', closeDrawer);
    $('drawer-scrim').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('drawer').hidden) closeDrawer();
    });

    $('expansion-form').addEventListener('submit', handleSupportSubmit);
  }

  function init() {
    renderAll();
    bindEvents();
    setView(getViewFromHash(), false);
  }

  init();
})();
