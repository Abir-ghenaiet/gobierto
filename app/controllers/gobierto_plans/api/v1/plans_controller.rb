# frozen_string_literal: true

module GobiertoPlans
  module Api
    module V1
      class PlansController < BaseController

        include ::GobiertoCommon::CustomFieldsApi

        def vocabularies_adapter
          :json_api
        end

        # GET /api/v1/plans
        # GET /api/v1/plans.json
        def index
          return unless stale? filtered_relation

          render(
            json: filtered_relation,
            links: links(:index),
            each_serializer: GobiertoPlans::PlanSerializer,
            adapter: :json_api
          )
        end

        # GET /api/v1/plans/1
        # GET /api/v1/plans/1.json
        def show
          find_resource

          render(
            json: @resource,
            serializer: GobiertoPlans::PlanSerializer,
            adapter: :json_api
          )
        end

        # GET /api/v1/data/queries/1/meta
        # GET /api/v1/data/queries/1/meta.json
        def metaax
          find_resource

          render(
            json: @resource,
            serializer: GobiertoPlans::PlanMetaSerializer,
            links: links(:metadata),
            adapter: :json_api
          )
        end

        private

        def base_relation
          if params[:id].present?
            find_resource
            @resource.nodes
          else
            plans_base_relation
          end
        end

        def plans_base_relation
          @plans_base_relation = current_site.plans.send(valid_preview_token? ? :itself : :published)
        end

        def filter_params
          params.fetch(:filter, {}).permit(:plan_type_id, :year)
        end

        def filtered_relation
          @filtered_relation ||= base_relation.where(filter_params)
        end

        def find_resource
          @resource = plans_base_relation.find(params[:id])
        end

        def links(self_key = nil)
          id = @resource&.id
          {
            index: gobierto_plans_api_v1_plans_path(filter: filter_params)
          }.tap do |hash|
            if id.present?
              hash.merge!(
                show: gobierto_plans_api_v1_plan_path(id),
                metadata: meta_gobierto_plans_api_v1_plan(id)
              )
            end

            hash[:self] = hash.delete(self_key) if self_key.present?
          end
        end

        def custom_fields
          @custom_fields ||= @resource.instance_level_custom_fields
        end
      end
    end
  end
end
