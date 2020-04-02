# frozen_string_literal: true

module GobiertoPlans
  class PlanTypesController < GobiertoPlans::ApplicationController
    include ::PreviewTokenHelper
    include User::SessionHelper

    before_action :overrided_root_redirect, only: [:show]

    def index
      redirect_to GobiertoPlans.root_path(current_site)
    end

    def show
      @plan_type = find_plan_type
      load_plans
      load_years
      load_year
      redirect_to gobierto_plans_plan_path(slug: params[:slug], year: @years.first) and return if @year.nil?

      @plan = PlanDecorator.new(find_plan)
      @sdgs = SdgDecorator.new(find_plan)

      @site_stats = GobiertoPlans::SiteStats.new site: current_site, plan: @plan
      @plan_updated_at = @site_stats.plan_updated_at

      respond_to do |format|
        format.html do
          @node_number = @plan.nodes.count
          @levels = @plan.levels
        end

        format.json do
          plan_tree, global_progress = Rails.cache.fetch(@plan.cache_key + "/plan_tree") do
            tree = GobiertoPlans::PlanTree.new(@plan)
            [tree.call, tree.global_progress]
          end

          render(
            json: { plan_tree: plan_tree,
                    option_keys: @plan.configuration_data&.dig("option_keys") || {},
                    level_keys: @plan.level_keys,
                    show_table_header: @plan.configuration_data&.dig("show_table_header"),
                    open_node: @plan.configuration_data&.dig("open_node"),
                    global_progress: global_progress }
          )
        end
      end
    end

    def sdg
      @plan_type = find_plan_type
      load_year
      redirect_to gobierto_plans_plan_sdg_path(slug: params[:slug], year: @years.first, sdg_slug: params[:sdg_slug]) and return if @year.nil?

      @plan = PlanDecorator.new(find_plan)
      @sdgs = SdgDecorator.new(find_plan)
      @sdg = @sdgs.sdg_term(params[:sdg_slug])
      @projects = @sdgs.projects_by_sdg(@sdg)
    end

    private

    def find_plan_type
      current_site.plan_types.find_by!(slug: params[:slug])
    end

    def find_plan
      valid_preview_token? ? @plan_type.plans.find_by!(year: params[:year]) : @plan_type.plans.published.find_by!(year: params[:year])
    end

    def load_plans
      @plans = @plan_type.plans.published
    end

    def load_years
      @years = @plans.pluck(:year).sort.reverse!
    end

    def load_year
      if params[:year]
        @year = params[:year].to_i
      end
    end
  end
end
