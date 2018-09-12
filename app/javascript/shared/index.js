import { AUTOCOMPLETE_DEFAULTS } from './modules/autocomplete_settings.js'
import { Class } from './modules/klass.js'
import './modules/module-search.js'
import './modules/module-sessions.js'
import './modules/module-site_header.js'
import './modules/globals.js'
import d3locale from './modules/d3-locale.js'
import { isDesktop, isMobile } from './modules/globals.js'
import './modules/tabs.js'
import './modules/velocity_settings.js'
import './modules/air-datepicker.js'
import './modules/shareContent.js'



// TODO: módulo nuevo?
import accounting from 'accounting'
import { settings } from './modules/accounting_settings.js'
accounting.settings = settings


// // https://www.giacomodebidda.com/how-to-import-d3-plugins-with-webpack/
// import * as d3v4Base from 'd3'
// import d3Legend from 'd3-svg-legend'
// import { wordwrap, parseAttributes, f, ascendingKey, descendingKey, conventions, drawAxis, attachTooltip, loadData, nestBy, round, clamp, polygonClip } from 'd3-jetpack' // NOTE: some methods returned conflict with d3v4, so must select
// import * as flight from 'flightjs'


export {
  AUTOCOMPLETE_DEFAULTS,
  Class,
  d3locale,
  isDesktop,
  isMobile,
  accounting
}
