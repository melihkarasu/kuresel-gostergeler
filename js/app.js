const COUNTRY_META = {
          TUR: { name: 'Türkiye', flag: '🇹🇷', color: '#ef4444' },
          DEU: { name: 'Almanya', flag: '🇩🇪', color: '#eab308' },
          USA: { name: 'ABD', flag: '🇺🇸', color: '#3b82f6' },
          GBR: { name: 'Birleşik Krallık', flag: '🇬🇧', color: '#a855f7' },
          JPN: { name: 'Japonya', flag: '🇯🇵', color: '#ec4899' },
          KOR: { name: 'Güney Kore', flag: '🇰🇷', color: '#06b6d4' },
          CHN: { name: 'Çin', flag: '🇨🇳', color: '#f97316' },
          AZE: { name: 'Azerbaycan', flag: '🇦🇿', color: '#10b981' },
          BRA: { name: 'Brezilya', flag: '🇧🇷', color: '#84cc16' },
          FRA: { name: 'Fransa', flag: '🇫🇷', color: '#6366f1' },
          ITA: { name: 'İtalya', flag: '🇮🇹', color: '#14b8a6' }
        };

        const INDICATORS = {
          'NY.GDP.PCAP.KD': { name: 'Kişi Başına GSYİH', unit: 'Sabit 2015 USD ($)', icon: '💰', decimals: 0 },
          'SP.DYN.LE00.IN': { name: 'Beklenen Yaşam Süresi', unit: 'Yıl', icon: '⏳', decimals: 1 },
          'FP.CPI.TOTL.ZG': { name: 'TÜFE Enflasyon Oranı', unit: 'Yıllık %', icon: '📈', decimals: 1 },
          'IT.NET.USER.ZS': { name: 'İnternet Kullanım Oranı', unit: '% Nüfus', icon: '🌐', decimals: 1 },
          'EG.ELC.ACCS.ZS': { name: 'Elektrik Erişim Oranı', unit: '% Nüfus', icon: '⚡', decimals: 1 },
          'EG.FEC.RNEW.ZS': { name: 'Yenilenebilir Enerji Payı', unit: '% Toplam', icon: '🌿', decimals: 1 },
          'EN.ATM.CO2E.PC': { name: 'Kişi Başına Karbon Salımı', unit: 'Ton / Kişi', icon: '🏭', decimals: 2 }
        };

        let activeIndicator = 'NY.GDP.PCAP.KD';
        let selectedCountries = ['TUR', 'DEU']; // Varsayılan Türkiye + Almanya
        let currentRawData = {}; // { 'TUR': [ { date: '2023', value: 14000 } ] }
        let chartInstance = null;

        // 1. Ülke Yönetimi
        function toggleCountry(code) {
          code = code.toUpperCase();
          if (selectedCountries.includes(code)) {
            if (selectedCountries.length === 1) {
              showToast('En az bir ülke seçili kalmalıdır.');
              return;
            }
            selectedCountries = selectedCountries.filter(c => c !== code);
          } else {
            if (selectedCountries.length >= 5) {
              showToast('Maksimum 5 ülke karşılaştırılabilir.');
              return;
            }
            selectedCountries.push(code);
          }
          renderSelectedTags();
          loadIndicatorData();
        }

        function renderSelectedTags() {
          const container = document.getElementById('selected-countries-tags');
          container.innerHTML = selectedCountries.map(code => {
            const m = COUNTRY_META[code] || { name: code, flag: '🌐', color: '#94a3b8' };
            const isTr = (code === 'TUR');
            return `
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm" style="background-color: ${m.color}15; border-color: ${m.color}60; color: ${m.color};">
                <span>${m.flag}</span>
                <span>${m.name}</span>
                <button onclick="toggleCountry('${code}')" class="ml-1 opacity-70 hover:opacity-100 font-bold">✕</button>
              </span>
            `;
          }).join('');
        }

        // 2. Gösterge Seçimi
        function setIndicator(indKey, name, unit) {
          activeIndicator = indKey;
          document.querySelectorAll('.ind-btn').forEach(btn => {
            btn.className = 'ind-btn p-3 rounded-2xl bg-white border border-mistral-hairline text-mistral-slate hover:text-white font-semibold text-xs transition text-left flex flex-col justify-between';
          });

          const map = {
            'NY.GDP.PCAP.KD': 'ind-gdp',
            'SP.DYN.LE00.IN': 'ind-life',
            'FP.CPI.TOTL.ZG': 'ind-cpi',
            'IT.NET.USER.ZS': 'ind-net',
            'EG.ELC.ACCS.ZS': 'ind-elc',
            'EG.FEC.RNEW.ZS': 'ind-renew',
            'EN.ATM.CO2E.PC': 'ind-co2'
          };
          const activeBtn = document.getElementById(map[indKey]);
          if (activeBtn) {
            activeBtn.className = 'ind-btn p-3 rounded-2xl bg-blue-600 text-white font-bold text-xs transition shadow text-left flex flex-col justify-between';
          }

          document.getElementById('chart-main-title').innerText = `${name} Tarihsel Trendi (1995 - 2024)`;
          document.getElementById('chart-sub-title').innerText = `Birim: ${unit}`;

          loadIndicatorData();
        }

        // 3. Veri Çekme (World Bank API)
        async function loadIndicatorData() {
          showLoading(true);
          currentRawData = {};

          try {
            const countriesParam = selectedCountries.join(';');
            const url = `https://api.worldbank.org/v2/country/${countriesParam}/indicator/${activeIndicator}?format=json&date=1995:2024&per_page=300`;
            
            const res = await fetch(url);
            const data = await res.json();

            if (data && data[1]) {
              data[1].forEach(row => {
                const cCode = row.countryiso3code || row.country?.id;
                if (!currentRawData[cCode]) currentRawData[cCode] = [];
                if (row.value !== null) {
                  currentRawData[cCode].push({
                    year: parseInt(row.date),
                    value: row.value
                  });
                }
              });

              // Yıllara göre sırala
              Object.keys(currentRawData).forEach(k => {
                currentRawData[k].sort((a,b) => a.year - b.year);
              });
            }

            renderDashboard();
          } catch(err) {
            showToast('Dünya Bankası verisi alınırken hata oluştu.');
          } finally {
            showLoading(false);
          }
        }

        function showLoading(show) {
          const spin = document.getElementById('loading-spinner');
          if (spin) spin.className = show ? 'py-16 text-center text-mistral-slate text-sm flex flex-col items-center gap-3' : 'hidden';
        }

        // 4. Panel ve Grafikleri Çiz
        function renderDashboard() {
          renderSummaryCards();
          renderChart();
          renderTable();
        }

        function renderSummaryCards() {
          const container = document.getElementById('latest-stats-cards');
          const indMeta = INDICATORS[activeIndicator] || { decimals: 1, unit: '' };

          container.innerHTML = selectedCountries.map(code => {
            const m = COUNTRY_META[code] || { name: code, flag: '🌐', color: '#3b82f6' };
            const series = currentRawData[code] || [];
            const latest = series.length > 0 ? series[series.length - 1] : null;
            const oldest = series.length > 5 ? series[series.length - 6] : (series[0] || null);

            let changePct = 0;
            if (latest && oldest && oldest.value > 0) {
              changePct = ((latest.value - oldest.value) / oldest.value) * 100;
            }

            return `
              <div class="p-5 rounded-2xl bg-white border border-mistral-hairline shadow flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="flex items-center gap-1.5 font-bold text-xs text-white">
                      <span>${m.flag}</span> ${m.name}
                    </span>
                    <span class="text-[10px] text-mistral-slate font-mono">${latest ? latest.year : '-'}</span>
                  </div>
                  <div class="text-2xl font-black text-white font-mono mt-1" style="color: ${m.color}">
                    ${latest ? latest.value.toLocaleString('tr-TR', { maximumFractionDigits: indMeta.decimals }) : '-'}
                  </div>
                  <p class="text-[11px] text-mistral-slate mt-1">
                    ${indMeta.unit}
                  </p>
                </div>
                <div class="pt-3 border-t border-mistral-hairline flex items-center justify-between mt-3 text-xs">
                  <span class="text-[10px] text-mistral-slate">Son 5 Yıl Değişimi:</span>
                  <span class="font-mono font-bold ${changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                    ${changePct >= 0 ? '+' : ''}%${changePct.toFixed(1)}
                  </span>
                </div>
              </div>
            `;
          }).join('');
        }

        function renderChart() {
          const ctx = document.getElementById('refah-chart').getContext('2d');
          if (chartInstance) chartInstance.destroy();

          // Ortak yıl kümesi oluştur (1995..2024)
          const allYearsSet = new Set();
          selectedCountries.forEach(c => {
            (currentRawData[c] || []).forEach(item => allYearsSet.add(item.year));
          });
          const sortedYears = Array.from(allYearsSet).sort((a,b) => a - b);

          const indMeta = INDICATORS[activeIndicator] || { decimals: 1, unit: '' };

          const datasets = selectedCountries.map(code => {
            const m = COUNTRY_META[code] || { name: code, color: '#3b82f6' };
            const seriesMap = new Map((currentRawData[code] || []).map(i => [i.year, i.value]));
            const dataPoints = sortedYears.map(yr => seriesMap.has(yr) ? seriesMap.get(yr) : null);

            return {
              label: m.name,
              data: dataPoints,
              borderColor: m.color,
              backgroundColor: m.color + '20',
              borderWidth: 2.5,
              tension: 0.25,
              pointRadius: 2,
              pointHoverRadius: 6,
              spanGaps: true
            };
          });

          chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
              labels: sortedYears,
              datasets: datasets
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: {
                  labels: { color: '#cbd5e1', font: { size: 11 } }
                },
                tooltip: {
                  backgroundColor: '#0f172a',
                  titleColor: '#94a3b8',
                  borderColor: '#334155',
                  borderWidth: 1,
                  callbacks: {
                    label: (context) => {
                      const val = context.parsed.y !== null ? context.parsed.y.toLocaleString('tr-TR', { maximumFractionDigits: indMeta.decimals }) : '-';
                      return ` ${context.dataset.label}: ${val} ${indMeta.unit}`;
                    }
                  }
                }
              },
              scales: {
                x: {
                  grid: { color: 'rgba(51, 65, 85, 0.2)' },
                  ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 12 }
                },
                y: {
                  grid: { color: 'rgba(51, 65, 85, 0.3)' },
                  ticks: { color: '#94a3b8', font: { size: 10 } }
                }
              }
            }
          });
        }

        function renderTable() {
          const headerRow = document.getElementById('table-header-row');
          const tbody = document.getElementById('table-body-rows');
          const indMeta = INDICATORS[activeIndicator] || { decimals: 1 };

          headerRow.innerHTML = '<th class="pb-2.5">Yıl</th>' + selectedCountries.map(c => {
            const m = COUNTRY_META[c] || { name: c, flag: '' };
            return `<th class="pb-2.5 text-right">${m.flag} ${m.name}</th>`;
          }).join('');

          // Yılları tersten listele (en yeni üstte)
          const allYearsSet = new Set();
          selectedCountries.forEach(c => {
            (currentRawData[c] || []).forEach(item => allYearsSet.add(item.year));
          });
          const sortedYears = Array.from(allYearsSet).sort((a,b) => b - a);

          tbody.innerHTML = sortedYears.map(yr => {
            return `
              <tr class="hover:bg-mistral-cream transition">
                <td class="py-2 text-mistral-slate font-bold">${yr}</td>
                ${selectedCountries.map(c => {
                  const item = (currentRawData[c] || []).find(i => i.year === yr);
                  const val = item ? item.value.toLocaleString('tr-TR', { maximumFractionDigits: indMeta.decimals }) : '-';
                  return `<td class="py-2 text-right text-mistral-slate">${val}</td>`;
                }).join('')}
              </tr>
            `;
          }).join('');
        }

        // 5. CSV Dışa Aktarma
        function exportDataCSV() {
          const allYearsSet = new Set();
          selectedCountries.forEach(c => {
            (currentRawData[c] || []).forEach(item => allYearsSet.add(item.year));
          });
          const sortedYears = Array.from(allYearsSet).sort((a,b) => a - b);

          let csv = 'Yil,' + selectedCountries.map(c => (COUNTRY_META[c]?.name || c)).join(',') + '\\n';

          sortedYears.forEach(yr => {
            const row = [yr];
            selectedCountries.forEach(c => {
              const item = (currentRawData[c] || []).find(i => i.year === yr);
              row.push(item ? item.value : '');
            });
            csv += row.join(',') + '\\n';
          });

          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `kuresel-gostergeler-${activeIndicator}-${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          showToast('✓ Veri tablosu CSV olarak indirildi!');
        }

        function showToast(msg) {
          const toast = document.getElementById('refah-toast');
          toast.innerText = msg;
          toast.classList.remove('hidden');
          setTimeout(() => toast.classList.add('hidden'), 3500);
        }

        // Başlangıç
        document.addEventListener('DOMContentLoaded', () => {
          renderSelectedTags();
          loadIndicatorData();
        });
