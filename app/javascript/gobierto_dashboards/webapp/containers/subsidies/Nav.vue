<template>
  <nav class="dashboards-home-nav">
    <ul>
      <router-link
        :to="{ name: 'summary' }"
        :class="{ 'is-active': activeTab === 0 }"
        tag="li"
        class="dashboards-home-nav--tab"
        @click.native="markTabAsActive(0)"
      >
        <i class="fas fa-chart-bar" />
        <i class="far fa-chart-bar" />
        <span>{{ labelSummary }}</span>
      </router-link>
      <router-link
        :to="{ name: 'subsidies_index' }"
        :class="{ 'is-active': activeTab === 1 }"
        tag="li"
        class="dashboards-home-nav--tab"
        @click.native="markTabAsActive(1)"
      >
        <i class="fas fa-clone" />
        <i class="far fa-clone" />
        <span>{{ labelSubsidies }}</span>
      </router-link>
    </ul>
  </nav>
</template>

<script>
export default {
  name: 'Nav',
  props: {
    activeTab: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      labelSummary: I18n.t("gobierto_dashboards.dashboards.subsidies.nav.summary"),
      labelSubsidies: I18n.t("gobierto_dashboards.dashboards.subsidies.nav.subsidies")
    }
  },
  routesToNavBarMapping: {
    'summary': 0,
    'subsidies_index': 1,
    'subsidies_show': 1
  },
  created(){
    const currentTabIndex = this.tabIndexFromRouteName();
    this.markTabAsActive(currentTabIndex);
  },
  methods: {
    markTabAsActive(index) {
      this.$emit("active-tab", index);
    },
    tabIndexFromRouteName(name=this.$router.currentRoute.name){
      return this.$options.routesToNavBarMapping[name];
    }
  }
}
</script>
