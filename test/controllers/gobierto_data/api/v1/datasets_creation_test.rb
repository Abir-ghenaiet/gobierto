# frozen_string_literal: true

require "test_helper"

module GobiertoData
  module Api
    module V1
      class DatasetsControllerTest < GobiertoControllerTest
        self.use_transactional_tests = false

        def auth_header
          @auth_header ||= "Bearer #{admin.primary_api_token}"
        end

        def site
          @site ||= sites(:madrid)
        end

        def site_with_module_disabled
          @site_with_module_disabled ||= sites(:santander)
        end

        def admin
          @admin ||= gobierto_admin_admins(:tony)
        end

        def multipart_form_params(file = "dataset1.csv")
          {
            dataset: {
              name: "Uploaded dataset",
              table_name: "uploaded_dataset",
              data_file: Rack::Test::UploadedFile.new("#{Rails.root}/test/fixtures/files/gobierto_data/#{file}"),
              visibility_level: "active"
            }
          }
        end

        # POST /api/v1/data/datasets
        #
        def test_dataset_creation_with_missing_params
          with(site: site) do
            assert_no_difference "GobiertoData::Dataset.count" do
              post(
                gobierto_data_api_v1_datasets_path,
                params: multipart_form_params("dataset1.csv").deep_merge(
                  dataset: { name: nil, table_name: nil }
                ),
                headers: { "Authorization" => auth_header }
              )

              assert_response :unprocessable_entity
              response_data = response.parsed_body
              assert_match(/can't be blank/, response_data.to_s)
            end
          end
        end

        # POST /api/v1/data/datasets
        #
        def test_dataset_creation_with_invalid_file_upload
          with(site: site) do
            assert_no_difference "GobiertoData::Dataset.count" do
              post(
                gobierto_data_api_v1_datasets_path,
                params: multipart_form_params("schema.json"),
                headers: { "Authorization" => auth_header }
              )

              assert_response :unprocessable_entity
              response_data = response.parsed_body
              assert_match(/CSV file malformed or with wrong encoding/, response_data.to_s)
            end
          end
        end

        # POST /api/v1/data/datasets
        #
        def test_dataset_creation_with_file_upload
          with(site: site) do
            post(
              gobierto_data_api_v1_datasets_path,
              params: multipart_form_params("dataset1.csv"),
              headers: { "Authorization" => auth_header }
            )

            assert_response :created
            response_data = response.parsed_body
            attributes = response_data["data"]["attributes"].with_indifferent_access

            [:name, :table_name, :visibility_level].each do |attribute|
              assert_equal multipart_form_params[:dataset][attribute], attributes[attribute]
            end

            query_result = GobiertoData::Connection.execute_query(site, "select * from uploaded_dataset", include_stats: true)
            assert_equal 4, query_result[:rows]
            query_result[:result].first.each_value do |value|
              assert value.is_a? String
            end
          end
        end

        # POST /api/v1/data/datasets
        #
        def test_dataset_creation_with_file_upload_and_schema_file_renaming_columns
          with(site: site) do
            post(
              gobierto_data_api_v1_datasets_path,
              params: multipart_form_params("dataset1.csv").deep_merge(
                dataset: { schema_file: Rack::Test::UploadedFile.new("#{Rails.root}/test/fixtures/files/gobierto_data/schema_rename_columns.json") }
              ),
              headers: { "Authorization" => auth_header }
            )

            assert_response :created
            response_data = response.parsed_body
            attributes = response_data["data"]["attributes"].with_indifferent_access

            [:name, :table_name, :visibility_level].each do |attribute|
              assert_equal multipart_form_params[:dataset][attribute], attributes[attribute]
            end

            query_result = GobiertoData::Connection.execute_query(site, "select * from uploaded_dataset", include_stats: true)
            assert_equal 4, query_result[:rows]

            query_result[:result].first.each_key do |column_name|
              assert_match(/_changed\Z/, column_name)
            end
          end
        end

        # POST /api/v1/data/datasets
        #
        def test_dataset_creation_with_file_upload_and_malformed_schema_file
          with(site: site) do
            post(
              gobierto_data_api_v1_datasets_path,
              params: multipart_form_params("dataset1.csv").deep_merge(
                dataset: { schema_file: Rack::Test::UploadedFile.new("#{Rails.root}/test/fixtures/files/gobierto_data/malformed_schema.json") }
              ),
              headers: { "Authorization" => auth_header }
            )

            assert_response :unprocessable_entity
            response_data = response.parsed_body
            assert_match(/Malformed file/, response_data.to_s)
          end
        end

        # POST /api/v1/data/datasets
        #
        def test_dataset_creation_with_file_upload_and_schema_file_with_invalid_type
          with(site: site) do
            post(
              gobierto_data_api_v1_datasets_path,
              params: multipart_form_params("dataset1.csv").deep_merge(
                dataset: { schema_file: Rack::Test::UploadedFile.new("#{Rails.root}/test/fixtures/files/gobierto_data/invalid_type_schema.json") }
              ),
              headers: { "Authorization" => auth_header }
            )

            assert_response :unprocessable_entity
            response_data = response.parsed_body
            assert_match(/The type 'invent' is not defined/, response_data.to_s)
          end
        end

        # PUT /api/v1/data/datasets/dataset-slug
        #
        def test_dataset_update_with_file_upload
          with(site: site) do
            post(
              gobierto_data_api_v1_datasets_path,
              params: multipart_form_params("dataset1.csv"),
              headers: { "Authorization" => auth_header }
            )

            assert_response :created
            response_data = response.parsed_body
            attributes = response_data["data"]["attributes"].with_indifferent_access
            slug = response_data["data"]["attributes"]["slug"]

            put(
              gobierto_data_api_v1_dataset_path(slug),
              params: multipart_form_params("dataset2.csv"),
              headers: { "Authorization" => auth_header }
            )

            assert_response :success
            response_data = response.parsed_body
            attributes = response_data["data"]["attributes"].with_indifferent_access

            [:name, :table_name, :visibility_level].each do |attribute|
              assert_equal multipart_form_params[:dataset][attribute], attributes[attribute]
            end

            query_result = GobiertoData::Connection.execute_query(site, "select * from uploaded_dataset", include_stats: true)
            assert_equal 1, query_result[:rows]
            query_result[:result].first.each_value do |value|
              assert value.is_a? String
            end
          end
        end

        # PUT /api/v1/data/datasets/dataset-slug
        #
        def test_dataset_update_with_file_upload_append
          with(site: site) do
            post(
              gobierto_data_api_v1_datasets_path,
              params: multipart_form_params("dataset1.csv"),
              headers: { "Authorization" => auth_header }
            )

            assert_response :created
            response_data = response.parsed_body
            attributes = response_data["data"]["attributes"].with_indifferent_access
            slug = response_data["data"]["attributes"]["slug"]

            put(
              gobierto_data_api_v1_dataset_path(slug),
              params: multipart_form_params("dataset2.csv").deep_merge(dataset: { append: "true" }),
              headers: { "Authorization" => auth_header }
            )

            assert_response :success
            response_data = response.parsed_body
            attributes = response_data["data"]["attributes"].with_indifferent_access

            [:name, :table_name, :visibility_level].each do |attribute|
              assert_equal multipart_form_params[:dataset][attribute], attributes[attribute]
            end

            query_result = GobiertoData::Connection.execute_query(site, "select * from uploaded_dataset", include_stats: true)
            assert_equal 5, query_result[:rows]
            query_result[:result].first.each_value do |value|
              assert value.is_a? String
            end
          end
        end

        # PUT /api/v1/data/datasets/dataset-slug
        #
        def test_dataset_update_with_file_upload_append_with_schema
          with(site: site) do
            post(
              gobierto_data_api_v1_datasets_path,
              params: multipart_form_params("dataset1.csv").deep_merge(
                dataset: { schema_file: Rack::Test::UploadedFile.new("#{Rails.root}/test/fixtures/files/gobierto_data/schema.json") }
              ),
              headers: { "Authorization" => auth_header }
            )

            assert_response :created
            response_data = response.parsed_body
            attributes = response_data["data"]["attributes"].with_indifferent_access
            slug = response_data["data"]["attributes"]["slug"]

            put(
              gobierto_data_api_v1_dataset_path(slug),
              params: multipart_form_params("dataset2.csv").deep_merge(dataset: { append: "true" }),
              headers: { "Authorization" => auth_header }
            )

            assert_response :success
            response_data = response.parsed_body
            attributes = response_data["data"]["attributes"].with_indifferent_access

            [:name, :table_name, :visibility_level].each do |attribute|
              assert_equal multipart_form_params[:dataset][attribute], attributes[attribute]
            end

            query_result = GobiertoData::Connection.execute_query(site, "select * from uploaded_dataset", include_stats: true)
            assert_equal 5, query_result[:rows]

            schema = Dataset.find_by_slug(slug).send(:table_schema)
            assert_equal "integer", schema["integer_column"]["type"]
            assert_equal "numeric", schema["decimal_column"]["type"]
            assert_equal "text", schema["text_column"]["type"]
            assert_equal "date", schema["date_column"]["type"]
          end
        end

      end
    end
  end
end
