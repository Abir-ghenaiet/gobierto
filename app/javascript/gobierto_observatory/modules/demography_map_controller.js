import { csv } from "d3-request";
import { format, formatDefaultLocale } from 'd3-format'
import { select, selectAll } from 'd3-selection';
import { max, min, sum, extent } from "d3-array";
import { schemeCategory10, scaleLinear } from 'd3-scale'
import { axisBottom } from 'd3-axis'
import dc from 'dc'
import crossfilter from 'crossfilter2'
//https://github.com/Leaflet/Leaflet.markercluster/issues/874
import * as L from 'leaflet';
import * as dc_leaflet from 'dc.leaflet';
import pairedRow from 'dc-addons-paired-row'
import stackedVertical from './charts/stacked_vertical'
import "leaflet/dist/leaflet.css";

const d3 = { csv, max, min, schemeCategory10, select, selectAll, format, formatDefaultLocale, sum, axisBottom, extent, scaleLinear }

const locale = d3.formatDefaultLocale({
  decimal: ',',
  thousands: '.',
  grouping: [3]
});

const zeroPad = (num, places) => String(num).padStart(places, '0')

function getSQLMonthFilter() {
  const today = new Date();
  const year = today.getFullYear();
  const month = zeroPad(today.getUTCMonth() + 1, 2);

  return ` WHERE to_char(fecha, 'YYYY-MM') = '${year}-${month}'`;
}

function getRemoteData(endpoint) {
  return new Promise((resolve) => {
    d3.csv(endpoint)
      .mimeType("text/csv")
      .get(function(error, csv) {
        if (error) throw error;
        resolve(csv);
      });
  })
}

function checkStatus(response) {
  if (response.status >= 200 && response.status < 400) {
    return Promise.resolve(response)
  } else {
    return Promise.reject(new Error(response.statusText))
  }
}

async function getMapPolygons(ineCode) {
  const polygonsRequest = new Request(`https://datos.gobierto.es/api/v1/data/data?sql=select%20geometry,csec,cdis%20from%20secciones_censales%20where%20cumun=${ineCode}`, {method: 'GET'});
  let response = await fetch(polygonsRequest);
  let dataRequest = await checkStatus(response);
  return dataRequest.json()
}

const marginHabNat = { top: 0, right: 0, bottom: 0, left: 0 }
const marginStudies = { top: 0, right: 0, bottom: 0, left: 180 }

export class DemographyMapController {
  constructor(options) {
    const entryPoint = document.getElementById(options.selector);
    const center = [options.mapLat, options.mapLon];
    const ineCode = options.ineCode;

    // Datasets contain the history of all the months, but we only require the last month of data
    const studiesEndpointFiltered = options.studiesEndpoint + getSQLMonthFilter();
    const originEndpointFiltered = options.originEndpoint + getSQLMonthFilter();

    if (entryPoint) {
      Promise.all([getRemoteData(studiesEndpointFiltered), getRemoteData(originEndpointFiltered), getMapPolygons(ineCode)]).then((rawData) => {
        const data = this.buildDataObject(rawData)

        const { studiesData, originData, mapPolygonsData } = data

        this.currentFilter = 'studies'; // options: 'studies' or 'origin'
        let ndxStudies = crossfilter(studiesData);
        let ndxOrigin = crossfilter(originData);
        const spinnerMap = document.getElementById('gobierto_observatory-demography-map-app-container-spinner')
        spinnerMap.classList.add('disable-spinner')
        let geojson = mapPolygonsData
        this.ndx = {
          filters: {
            studies: {
              all: ndxStudies,
              bySex: ndxStudies.dimension(d => d.sexo),
              byAge: ndxStudies.dimension(function(d) {
                var age_range = 'Unknown';
                d.rango_edad = parseInt(d.rango_edad.split('-')[0])

                if (d.rango_edad <= 10) {
                  age_range = '0-10';
                } else if (d.rango_edad <= 20) {
                  age_range = '11-20';
                } else if (d.rango_edad <= 30) {
                  age_range = '21-30';
                } else if (d.rango_edad <= 40) {
                  age_range = '31-40';
                } else if (d.rango_edad <= 50) {
                  age_range = '41-50';
                } else if (d.rango_edad <= 60) {
                  age_range = '51-60';
                } else if (d.rango_edad <= 70) {
                  age_range = '61-70';
                } else if (d.rango_edad <= 80) {
                  age_range = '71-80';
                } else if (d.rango_edad <= 90) {
                  age_range = '81-90';
                } else if (d.rango_edad <= 100) {
                  age_range = '91-100';
                }
                return [d.sexo, age_range];
              }),
              byCusec: ndxStudies.dimension(d => d.cusec),
              byNationality: ndxStudies.dimension(d => d.nacionalidad),
              byOriginNational: null,
              byOriginOther: null,
              byStudies: ndxStudies.dimension(d => d.formacion),
            },
            origin: {
              all: ndxOrigin,
              bySex: ndxOrigin.dimension(d => d.sexo),
              byAge: ndxOrigin.dimension(function(d) {
                var age_range = 'Unknown';
                d.rango_edad = parseInt(d.rango_edad.split('-')[0])

                if (d.rango_edad <= 10) {
                  age_range = '0-10';
                } else if (d.rango_edad <= 20) {
                  age_range = '11-20';
                } else if (d.rango_edad <= 30) {
                  age_range = '21-30';
                } else if (d.rango_edad <= 40) {
                  age_range = '31-40';
                } else if (d.rango_edad <= 50) {
                  age_range = '41-50';
                } else if (d.rango_edad <= 60) {
                  age_range = '51-60';
                } else if (d.rango_edad <= 70) {
                  age_range = '61-70';
                } else if (d.rango_edad <= 80) {
                  age_range = '71-80';
                } else if (d.rango_edad <= 90) {
                  age_range = '81-90';
                } else if (d.rango_edad <= 100) {
                  age_range = '91-100';
                }
                return [d.sexo, age_range];
              }),
              byCusec: ndxOrigin.dimension(d => d.cusec),
              byNationality: ndxOrigin.dimension(d => d.nacionalidad),
              byOriginNational: ndxOrigin.dimension(d => d.nacionalidad === 'Nacional' ? d.procedencia : 'Extranjero'),
              byOriginOther: ndxOrigin.dimension(d => d.nacionalidad === 'Extranjero' ? d.procedencia : 'Nacional'),
              byStudies: null,
            },
          }
        }
        this.calculateGroups();

        this.chart1 = this.renderInhabitants("#inhabitants");
        this.chart2 = this.renderBarNationality("#bar-nationality");
        this.chart3 = this.renderBarSex("#bar-sex");
        this.chart4 = this.renderPyramid("#piramid-age-sex");
        this.chart5 = this.renderStudies("#bar-by-studies");
        this.chart6 = this.renderOriginNational("#bar-by-origin-spaniards");
        this.chart7 = this.renderOriginOthers("#bar-by-origin-others");
        this.chart8 = this.renderChoroplethMap("#map", geojson, center);
        // Don't know why we need to do this
        dc.renderAll("main");

        document.querySelectorAll("#close").forEach(button => button.addEventListener('click', () => {
          this.clearFilters(event)
        }));
      });
    }
  }

  calculateGroups() {
    this.ndx.groups = {
      studies: {
        all: this.ndx.filters.studies.all.groupAll().reduceSum(d => d.total),
        bySex: this.ndx.filters.studies.bySex.group().reduceSum(d => d.total),
        byAge: this.ndx.filters.studies.byAge.group().reduceSum(d => d.total),
        byCusec: this.ndx.filters.studies.byCusec.group().reduceSum(d => d.total),
        byNationality: this.ndx.filters.studies.byNationality.group().reduceSum(d => d.total),
        byOriginNational: null,
        byOriginOther: null,
        byStudies: this.ndx.filters.studies.byStudies.group().reduceSum(d => d.total),
      },
      origin: {
        all: this.ndx.filters.origin.all.groupAll().reduceSum(d => d.total),
        bySex: this.ndx.filters.origin.bySex.group().reduceSum(d => d.total),
        byAge: this.ndx.filters.origin.byAge.group().reduceSum(d => d.total),
        byCusec: this.ndx.filters.origin.byCusec.group().reduceSum(d => d.total),
        byNationality: this.ndx.filters.origin.byNationality.group().reduceSum(d => d.total),
        byOriginNational: this.remove_empty_bins(this.ndx.filters.origin.byOriginNational.group().reduceSum(d => d.total)),
        byOriginOther: this.remove_empty_bins(this.ndx.filters.origin.byOriginOther.group().reduceSum(d => d.total)),
        byStudies: null,
      }
    }
  }

  buildDataObject(rawData) {
    const csvData = [rawData[0], rawData[1]]
    const geoData = rawData[2]
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < csvData[i].length; j++) {
        let d = csvData[i][j];
        // Rewrite cusec to match it with the map cusec
        d['cusec'] = d['seccion'] + '-' + d['distrito']
        d['total'] = +d['total']
        if (d['procedencia'] === '') {
          d['procedencia'] = 'GETAFE *'
        }
        if (d['formacion'] === 'No sabe leer ni escribir') {
          d['formacion'] = 'Ni leer ni escribir'
        } else if (d['formacion'] === 'Ense?anza Secundaria') {
          d['formacion'] = 'Ens. Secundaria'
        } else if (d['formacion'] === 'B.Superior.BUP,COU') {
          d['formacion'] = 'Bachillerato sup'
        } else if (d['formacion'] === 'Ense?anza Primaria incomp') {
          d['formacion'] = 'Ens. Pri. incompleta'
        } else if (d['formacion'] === 'Doctorado Postgrado') {
          d['formacion'] = 'Doctorado'
        } else if (d['formacion'] === 'Doctorado Postgrado') {
          d['formacion'] = 'Doctorado'
        } else if (d['formacion'] === 'FP1 Grado Medio') {
          d['formacion'] = 'Formación prof. 1'
        } else if (d['formacion'] === 'FP2 Grado Superior') {
          d['formacion'] = 'Formación prof. 2'
        } else if (d['formacion'] === 'Licenciado Universitario') {
          d['formacion'] = 'Licenciado'
        }
      }
    }

    const sections = {
      "type": "FeatureCollection",
      "features": geoData.data.map(i => ({
        "type": "Feature",
        "geometry": JSON.parse(i.geometry),
        "properties": {
          "cusec": `${i.csec}-${i.cdis}`
        }
      }))
    }

    return {
      studiesData: csvData[0],
      originData: csvData[1],
      mapPolygonsData: sections
    }
  }

  remove_empty_bins(source_group) {
    return {
      all: function() {
        return source_group.all().filter(function(d) {
          return d.key !== 'Nacional' && d.key !== 'Extranjero';
        });
      }
    };
  }

  updateOriginFilters(dimension, filterValue) {
    if (filterValue.length) {
      this.ndx.filters.origin[dimension].filter(filterValue[0]);
    } else {
      this.ndx.filters.origin[dimension].filterAll();
    }
    this.calculateGroups();
  }

  updateStudiesFilters(dimension, filterValue) {
    if (filterValue.length) {
      this.ndx.filters.studies[dimension].filter(filterValue[0]);
    } else {
      this.ndx.filters.studies[dimension].filterAll();
    }
    this.calculateGroups();
  }

  renderInhabitants(selector) {
    const chart = new dc.dataCount(selector, "main");
    chart
      .crossfilter(this.ndx.filters.studies.all)
      .groupAll(this.ndx.groups.studies.all)
      .formatNumber(locale.format(',.0f'))
      .html({
        all: '<h2 class="gobierto_observatory-habitants-title">Total habitantes</h2><h3 class="gobierto_observatory-habitants-number">%total-count</h3>',
        some: '<h2 class="gobierto_observatory-habitants-title">Habitantes</h2><h3 class="gobierto_observatory-habitants-number">%filter-count</h3>'
      })

    const that = this;
    chart
      .on('filtered', (chart) => {
        that.updateOriginFilters('all', chart.filters());
      })
    return chart;
  }

  renderBarNationality(selector) {
    const chart = stackedVertical(selector, "main");
    const sumAllValues = this.ndx.groups.origin.all.value()
    chart
      .width(250)
      .height(45)
      .group(this.ndx.groups.studies.byNationality)
      .dimension(this.ndx.filters.studies.byNationality)
      .elasticX(true)
      .gap(10)
      .margins(marginHabNat)
      .renderTitleLabel(true)
      .fixedBarHeight(10)
      .title(d => `${((d.value * 100) / sumAllValues).toFixed(1)}%`)
      .xAxis().ticks(4);

    const that = this;
    chart
      .on('filtered', (chart) => {
        that.updateOriginFilters('byNationality', chart.filters());
        const container = document.getElementById('container-bar-nationality')
        that.activeFiltered(container)

        that.rebuildChoroplethColorDomain()
      });
    return chart;
  }

  renderBarSex(selector) {
    const chart = stackedVertical(selector, "main");
    const sumAllValues = this.ndx.groups.origin.all.value()

    chart
      .width(250)
      .height(45)
      .group(this.ndx.groups.studies.bySex)
      .dimension(this.ndx.filters.studies.bySex)
      .elasticX(true)
      .gap(10)
      .margins(marginHabNat)
      .renderTitleLabel(true)
      .fixedBarHeight(10)
      .labelOffsetX(-110)
      .titleLabelOffsetX(145)
      .title(d => `${((d.value * 100) / sumAllValues).toFixed(1)}%`)
      .xAxis().ticks(4);

    const that = this;
    chart
      .on('filtered', (chart) => {
        that.updateOriginFilters('bySex', chart.filters());
        const container = document.getElementById('container-bar-sex')
        that.activeFiltered(container)

        that.rebuildChoroplethColorDomain()
      });

    return chart;
  }

  renderPyramid(selector) {
    const chart = pairedRow(selector, "main");
    dc.chartRegistry.register(chart, 'main');
    const that = this;

    let group = {
      all: function() {
        var age_ranges = ['91-100','81-90','71-80','61-70','51-60','41-50','31-40','21-30','11-20','0-10']

        // convert to object so we can easily tell if a key exists
        var values = {};
        that.ndx.groups.studies.byAge.all().forEach(function(d) {
          values[d.key[0] + '.' + d.key[1]] = d.value;
        });

        // convert back into an array for the chart, making sure that all age_ranges exist
        var g = [];
        age_ranges.forEach(function(age_range) {
          g.push({
            key: ['Hombre', age_range],
            value: values['Hombre.' + age_range] || 0
          });
          g.push({
            key: ['Mujer', age_range],
            value: values['Mujer.' + age_range] || 0
          });
        });

        return g;
      }
    };

    chart.options({
      // display
      width: 250,
      height: 220,
      labelOffsetX: -50,
      fixedBarHeight: 10,
      gap: 10,
      colorCalculator: function(d) {
        if (d.key[0] === 'Male') {
          return '#008E9C';
        }
        return '#F8B206';
      },
      // data
      dimension: this.ndx.filters.studies.byAge,
      group: group,
      // misc
      renderTitleLabel: true,
      title: d => d.key[1],
      label: d => d.key[1],
      cap: 10,
      // if elastic is set than the sub charts will have different extent ranges, which could mean the data is interpreted incorrectly
      elasticX: true,
      // custom
      leftKeyFilter: d => d.key[0] === 'Hombre',
      rightKeyFilter: d => d.key[0] === 'Mujer'
    })

    chart.rightChart().options({ width: 185 })

    chart.rightChart().on('filtered', function() {
      const container = document.getElementById('container-piramid-age-sex')
      that.activeFiltered(container)
      that.rebuildChoroplethColorDomain()
      dc.redrawAll('main');
    })

    chart.leftChart().on('filtered', function() {
      const container = document.getElementById('container-piramid-age-sex')
      that.activeFiltered(container)
      that.rebuildChoroplethColorDomain()
      dc.redrawAll('main');
    })

    let allRows = d3.selectAll('g.row rect')
    allRows
      .attr('opacity', 0)

    chart.render()
    return chart;
  }

  renderStudies(selector) {
    const chart = new dc.rowChart(selector, "main");
    const sumAllValues = this.ndx.groups.origin.all.value()
    chart
      .width(300)
      .height(230)
      .cap(10) // Show only top 10
      .group(this.ndx.groups.studies.byStudies)
      .dimension(this.ndx.filters.studies.byStudies)
      .elasticX(true)
      .gap(10)
      .margins(marginStudies)
      .renderTitleLabel(true)
      .fixedBarHeight(10)
      .labelOffsetX(-180)
      .titleLabelOffsetX(125)
      .title(d => `${((d.value * 100) / sumAllValues).toFixed(1)}%`)
      .xAxis().ticks(4);

    const that = this;
    chart
      .on('filtered', (chart) => {
        that.currentFilter = 'studies';
        const container = document.getElementById('container-bar-by-studies')
        that.activeFiltered(container)

        that.rebuildChoroplethColorDomain()
        if (chart.filter() !== null) {
          document.getElementById("bar-by-origin-spaniards").style.visibility = 'hidden';
          document.getElementById("bar-by-origin-others").style.visibility = 'hidden';
        } else {
          document.getElementById("bar-by-origin-spaniards").style.visibility = 'visible';
          document.getElementById("bar-by-origin-others").style.visibility = 'visible';
        }
      });
    chart.render()
    return chart;
  }

  renderOriginNational(selector) {
    const chart = new dc.rowChart(selector, "main");
    const sumAllValues = this.ndx.groups.origin.all.value()
    chart
      .width(300)
      .height(210)
      .cap(10) // Show only top 10
      .othersGrouper(null) // Don't show the rest of the 20 in Other class - https://dc-js.github.io/dc.js/docs/html/CapMixin.html
      .group(this.ndx.groups.origin.byOriginNational)
      .dimension(this.ndx.filters.origin.byOriginNational)
      .elasticX(true)
      .gap(10)
      .margins(marginStudies)
      .renderTitleLabel(true)
      .fixedBarHeight(10)
      .labelOffsetX(-180)
      .titleLabelOffsetX(125)
      .title(d => `${((d.value * 100) / sumAllValues).toFixed(1)}%`)
      .xAxis().ticks(4)

    const that = this;
    chart
      .on('filtered', (chart) => {
        that.currentFilter = 'origin';
        if (chart.filter() !== null) {
          document.getElementById("bar-by-studies").style.visibility = 'hidden';
        } else {
          document.getElementById("bar-by-studies").style.visibility = 'visible';
        }
        that.chart1.dimension(that.ndx.filters.origin.all);
        that.chart1.group(that.ndx.groups.origin.all);
        that.chart2.dimension(that.ndx.filters.origin.byNationality);
        that.chart2.group(that.ndx.groups.origin.byNationality);
        that.chart3.dimension(that.ndx.filters.origin.bySex);
        that.chart3.group(that.ndx.groups.origin.bySex);
        that.chart8.dimension(that.ndx.filters.origin.byCusec);
        that.chart8.group(that.ndx.groups.origin.byCusec);

        that.rebuildChoroplethColorDomain()
      });
    return chart;
  }

  renderOriginOthers(selector) {
    const chart = new dc.rowChart(selector, "main");
    const sumAllValues = this.ndx.groups.origin.all.value()
    chart
      .width(300)
      .height(210)
      .cap(10) // Show only top 20
      .othersGrouper(null) // Don't show the rest of the 20 in Other clashttps://dc-js.github.io/dc.js/docs/html/CapMixin.htmls
      .group(this.ndx.groups.origin.byOriginOther)
      .dimension(this.ndx.filters.origin.byOriginOther)
      .elasticX(true)
      .gap(10)
      .margins(marginStudies)
      .renderTitleLabel(true)
      .fixedBarHeight(10)
      .labelOffsetX(-180)
      .titleLabelOffsetX(125)
      .title(d => `${((d.value * 100) / sumAllValues).toFixed(1)}%`)
      .xAxis().ticks(4);

    const that = this;
    chart
      .on('filtered', (chart) => {
        that.currentFilter = 'origin';
        /*const container = document.getElementById('container-bar-origin-others')
        that.activeFiltered(container)*/
        if (chart.filter() !== null) {
          document.getElementById("bar-by-studies").style.visibility = 'hidden';
        } else {
          document.getElementById("bar-by-studies").style.visibility = 'visible';
        }
        that.chart1.dimension(that.ndx.filters.origin.all);
        that.chart1.group(that.ndx.groups.origin.all);
        that.chart2.dimension(that.ndx.filters.origin.byNationality);
        that.chart2.group(that.ndx.groups.origin.byNationality);
        that.chart3.dimension(that.ndx.filters.origin.bySex);
        that.chart3.group(that.ndx.groups.origin.bySex);
        that.chart8.dimension(that.ndx.filters.origin.byCusec);
        that.chart8.group(that.ndx.groups.origin.byCusec);

        that.rebuildChoroplethColorDomain()
      });
    return chart;
  }

  renderChoroplethMap(selector, data, center) {
    const zoom = 13.65;
    this.resetMapSelection()
    const chart = new dc_leaflet.choroplethChart(selector, "main");
    dc.chartRegistry.register(chart, "main");
    const legendMap = new dc_leaflet.legend(selector).position('topright');
    const mapboxAccessToken = "pk.eyJ1IjoiYmltdXgiLCJhIjoiY2swbmozcndlMDBjeDNuczNscTZzaXEwYyJ9.oMM71W-skMU6IN0XUZJzGQ"
    const scaleColors = ['#fcde9c','#faa476','#f0746e','#e34f6f','#dc3977','#b9257a','#7c1d6f']

    chart
      .center(center, zoom)
      .zoom(zoom)
      .mapOptions({
        scrollWheelZoom: false,
      })
      .renderPopup(true)
      .popup(function(d,feature) {
        return feature.properties.cusec+" : "+d.value;
      })
      .dimension(this.ndx.filters.studies.byCusec)
      .group(this.ndx.groups.studies.byCusec)
      .geojson(data.features)
      .colors(scaleColors)
      .colorAccessor(d => d.value)
      .colorDomain([
          d3.min(this.ndx.groups.studies.byCusec.all(), dc.pluck('value')),
          d3.max(this.ndx.groups.studies.byCusec.all(), dc.pluck('value'))
      ])
      .featureKeyAccessor(feature => feature.properties.cusec)
      .legend(legendMap)
      .tiles(function(map) {
        L.tileLayer('https://api.mapbox.com/styles/v1/{username}/{style_id}/tiles/{z}/{x}/{y}?access_token=' + mapboxAccessToken, {
          scrollWheelZoom: false,
          username: "gobierto",
          style_id: "ck18y48jg11ip1cqeu3b9wpar",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          tileSize: 512,
          minZoom: 9,
          maxZoom: 16,
          zoomOffset: -1
        }).addTo(map)

        L.geoJson(data.features, {
          onEachFeature: onEachFeature
        }).addTo(map)
      })

    function highlightFeature(e) {
      var layer = e.target;

      layer.setStyle({
        weight: 5,
        dashArray: '',
        fillOpacity: 0.7
      });

      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
      }
    }

    function resetHighlight(e) {
      var layer = e.target;

      layer.setStyle({
        weight: 1,
        dashArray: '',
        fillOpacity: 0.7
      });
    }

    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
      });
    }

    chart.on('filtered', function() {
      dc.redrawAll('main', );
      const buttonReset = document.getElementById('reset-filters')
      buttonReset.classList.remove('disabled')
    })


    return chart;
  }

  resetMapSelection() {
    //Remove the selection of 'sección censal'
    const buttonReset = document.getElementById('reset-filters')
    buttonReset.addEventListener("click", function() {
      const chartFromList = dc.chartRegistry.list('main')[7]
      const activeFilters = chartFromList.filters().length
      for (let index = 0; index < activeFilters; index++) {
        chartFromList.filter(chartFromList.filters()[0])
      }
      chartFromList.redrawGroup();
      chartFromList._doRedraw();
      buttonReset.classList.add('disabled')
    });
  }

  activeFiltered(container) {
    const {
      id,
      className
    } = container
    //Get all rect from the chart
    let getRectElements = d3.selectAll(`#${id} svg .row rect`)
    getRectElements = getRectElements._groups[0]
    //Convert rect's to array
    const rectArray = Array.from(getRectElements)
    const element = document.getElementById(id)
    if (className.includes('active-filtered')) {
      setTimeout(() => {
        //Check if all rect's are deselected, if deselected is true so remove active-fitered.
        const deselected = rectArray.every(rect => rect.classList.value === '');
        if (deselected) {
          element.classList.remove('active-filtered')
        } else {
          return false
        }
      }, 100)
    } else {
      element.classList.toggle('active-filtered')
    }
  }

  //Remove filters when the user click on close button
  clearFilters(event) {
    //Get the container parent from the chart
    const target = event.target;
    const parent = target.parentElement;
    const chart = parent.parentElement;
    if (chart.id === 'container-bar-by-studies') {
      //Pass the number of the chart in chartRegisterList
      this.clearFilterList(4)
    } else if (chart.id === 'container-bar-nationality') {
      this.clearFilterList(1)
    } else if (chart.id === 'container-bar-sex') {
      this.clearFilterList(2)
    } else if (chart.id === 'container-piramid-age-sex') {
      //Piramid Chart is compose by two children rowChart()
      //We need to reset filters from both charts
      const chartFromList = dc.chartRegistry.list('main')[3]
      const chartFromListLeft = chartFromList.leftChart()
      const chartFromListRight = chartFromList.rightChart()
      //Get the filters length
      const activeFilters = chartFromListLeft.filters().length
      const activeFiltersRight = chartFromListRight.filters().length
      //reset every filter
      for (let index = 0; index < activeFilters; index++) {
        chartFromListLeft.filter(chartFromListLeft.filters()[0])
      }
      for (let index = 0; index < activeFiltersRight; index++) {
        chartFromListRight.filter(chartFromListRight.filters()[0])
      }
      //Redraw
      setTimeout(() => {
        chart.classList.remove('active-filtered')
      }, 0)
      dc.chartRegistry.list('main')[0].redrawGroup()
    }
  }

  clearFilterList(chart) {
    //Get the chart from the register list
    const chartFromList = dc.chartRegistry.list('main')[chart]
    //Get the container
    const containerChartId = chartFromList.root()._groups[0][0].parentElement.id
    //Get active filters
    const activeFilters = chartFromList.filters().length
    //Loop over active filters
    for (let index = 0; index < activeFilters; index++) {
      //Remove active filters
      chartFromList.filter(chartFromList.filters()[0])
    }
    //Redraw charts
    chartFromList.redrawGroup();
    setTimeout(() => {
      //Finally remove the class
      const containerChart = document.getElementById(`${containerChartId}`)
      containerChart.classList.remove('active-filtered')
    }, 0)
  }

  //When the user interactive with the filter we need to rebuild color domain for update choroplethChart
  rebuildChoroplethColorDomain() {
    //Get the Map from the register list
    const choroplethChart = dc.chartRegistry.list('main')[7]
    //Rebuild color domain with the selected values.
    choroplethChart.colorDomain([
        d3.min(this.ndx.groups.studies.byCusec.all(), dc.pluck('value')),
        d3.max(this.ndx.groups.studies.byCusec.all(), dc.pluck('value'))
    ])
  }
}

export default getRemoteData
