# frozen_string_literal: true

module GobiertoData
  module Api
    module V1
      class DatasetsController < BaseController

        include ::GobiertoCommon::CustomFieldsApi
        include ::GobiertoCommon::SecuredWithAdminToken

        skip_before_action :set_admin_with_token, except: [:new, :create, :update, :destroy]

        # GET /api/v1/data/datasets
        # GET /api/v1/data/datasets.json
        # GET /api/v1/data/datasets.csv
        # GET /api/v1/data/datasets.xlsx
        def index
          relation = filtered_relation
          respond_to do |format|
            format.json do
              render json: relation, links: links(:index), adapter: :json_api
            end

            format.csv do
              render_csv(csv_from_relation(relation, csv_options_params))
            end

            format.xlsx do
              send_data xlsx_from_relation(relation, name: controller_name.titleize).read, filename: "#{controller_name.underscore}.xlsx"
            end
          end
        end

        # GET /api/v1/data/datasets/dataset-slug
        # GET /api/v1/data/datasets/dataset-slug.json
        # GET /api/v1/data/datasets/dataset-slug.csv
        # GET /api/v1/data/datasets/dataset-slug.xlsx
        def show
          find_item
          relation = @item.rails_model.all
          query_result = execute_query relation
          respond_to do |format|
            format.json do
              render(
                json:
                {
                  data: query_result.delete(:result),
                  meta: query_result,
                  links: links(:data)
                },
                adapter: :json_api
              )
            end

            format.csv do
              render_csv(csv_from_query_result(query_result.fetch(:result, ""), csv_options_params))
            end

            format.xlsx do
              send_data xlsx_from_query_result(query_result.fetch(:result, ""), name: @item.name).read, filename: "#{@item.slug}.xlsx"
            end
          end
        end

        # GET /api/v1/data/datasets/dataset-slug/metadata
        # GET /api/v1/data/datasets/dataset-slug/metadata.json
        def dataset_meta
          find_item

          render(
            json: @item,
            serializer: ::GobiertoData::DatasetMetaSerializer,
            exclude_links: true,
            links: links(:metadata),
            adapter: :json_api
          )
        end

        def new
          @form = DatasetForm.new(name_translations: available_locales_hash, site_id: current_site.id)

          render(
            json: @form,
            serializer: ::GobiertoData::DatasetFormSerializer,
            exclude_links: true,
            links: links(:new),
            adapter: :json_api
          )
        end

        def create
          @form = DatasetForm.new(dataset_params.merge(site_id: current_site.id))

          if @form.save
            @item = @form.resource
            render(
              json: @form,
              serializer: ::GobiertoData::DatasetFormSerializer,
              status: :created,
              exclude_links: true,
              links: links(:metadata),
              adapter: :json_api
            )
          else
            api_errors_render(@form, adapter: :json_api)
          end
        end

        def update
          find_item
          @form = DatasetForm.new(dataset_params.merge(id: @item.id, site_id: current_site.id))

          if @form.save
            render(
              json: @form,
              serializer: ::GobiertoData::DatasetFormSerializer,
              exclude_links: true,
              links: links(:metadata),
              adapter: :json_api
            )
          else
            api_errors_render(@form, adapter: :json_api)
          end
        end

        private

        def base_relation
          current_site.datasets
        end

        def find_item
          @item = base_relation.find_by!(slug: params[:slug])
        end

        def execute_query(relation)
          GobiertoData::Connection.execute_query(current_site, relation.to_sql)
        end

        def links(self_key = nil)
          id = @item&.id
          slug = @item&.slug
          {
            index: gobierto_data_api_v1_datasets_path,
            datasets_meta: meta_gobierto_data_api_v1_datasets_path,
            queries: gobierto_data_api_v1_queries_path,
            visualizations: gobierto_data_api_v1_visualizations_path,
            new: new_gobierto_data_api_v1_visualization_path
          }.tap do |hash|
            if id.present?
              hash.merge!(
                data: gobierto_data_api_v1_dataset_path(params.fetch(:slug, slug)),
                metadata: meta_gobierto_data_api_v1_dataset_path(params.fetch(:slug, slug)),
                queries: gobierto_data_api_v1_queries_path(filter: { dataset_id: id }),
                visualizations: gobierto_data_api_v1_visualizations_path(filter: { dataset_id: id }),
                favorites: gobierto_data_api_v1_dataset_favorites_path(@item.slug)
              )
            end

            hash[:self] = hash.delete(self_key) if self_key.present?
          end
        end

        def dataset_params
          ActiveModelSerializers::Deserialization.jsonapi_parse(params, only: [:name_translations, :name, :table_name, :slug, :data_path, :csv_separator, :schema, :append])
        end
      end
    end
  end
end
