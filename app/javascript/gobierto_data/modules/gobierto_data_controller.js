import Vue from "vue";
import VueRouter from "vue-router";
import VueCodemirror from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'

Vue.use(VueRouter);
Vue.use(VueCodemirror);
Vue.config.productionTip = false;

export class GobiertoDataController {
  constructor(options) {
    const selector = "gobierto-datos-app";

    // Mount Vue application
    const entryPoint = document.getElementById(selector);
    if (entryPoint) {
      const htmlRouterBlock = `
        <keep-alive>
          <transition name="fade" mode="out-in">
            <router-view :key="$route.fullPath"></router-view>
          </transition>
        </keep-alive>
      `;

      entryPoint.innerHTML = htmlRouterBlock;

      const Home = () => import("../webapp/pages/Home.vue");
      const Sets = () => import("../webapp/pages/Sets.vue");


      const router = new VueRouter({
        mode: "history",
        routes: [{
            path: "/datasets",
            name: "home", component: Home
          },
          {
            path: "/datasets/:id",
            name: "dataset",
            component: Sets
          }
        ]
      })

      const baseTitle = document.title;
      router.afterEach(to => {
        // Wait 2 ticks
        Vue.nextTick(() =>
          Vue.nextTick(() => {
            let title = baseTitle;
            if (to.name === "project") {
              const { item: { title: projectTitle } = {} } = to.params;

              if (projectTitle) {
                const titleI18n = projectTitle
                  ? `${projectTitle} · `
                  : "";

                title = `${titleI18n}${baseTitle}`;
              }
            }

            document.title = title;
          })
        );
      });

      new Vue({
        router,
        data: options,
      }).$mount(entryPoint);
    }
  }
}
