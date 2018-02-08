# frozen_string_literal: true

require "test_helper"

module GobiertoAdmin
  module GobiertoParticipation
    class CreateProcessTest < ActionDispatch::IntegrationTest
      def admin
        @admin ||= gobierto_admin_admins(:nick)
      end

      def site
        @site ||= sites(:madrid)
      end

      def process
        @process ||= gobierto_participation_processes(:gender_violence_process)
      end

      def process_stage
        @process_stage ||= gobierto_participation_process_stages(:gender_violence_process_results_stage)
      end

      def edit_process_stage_path
        @edit_process_stage_path = edit_admin_participation_process_process_stage_path(process_stage, process_id: process.id)
      end

      def group
        @group ||= gobierto_participation_processes(:green_city_group_active_empty)
      end

      def cms_page
        @cms_page ||= gobierto_cms_pages(:consultation_faq)
      end

      def test_update_process
        with_signed_in_admin(admin) do
          with_current_site(site) do
            visit edit_admin_participation_process_path(process)

            within "form.edit_process" do
              fill_in "process_title_translations_en", with: "Edited process title"
              select "Women", from: "process_issue_id"
              select "Center", from: "process_scope_id"

              click_button "Update"
            end

            assert has_message? "Process was successfully updated"

            visit admin_participation_path

            assert has_content? "Edited process title"

            process.reload

            assert_equal "Edited process title", process.title
            assert_equal "Women", process.issue.name
            assert_equal "Center", process.scope.name
          end
        end
      end

      def test_update_group
        with_javascript do
          with_signed_in_admin(admin) do
            with_current_site(site) do
              visit edit_admin_participation_process_path(group)

              within "form.edit_process" do
                fill_in "process_title_translations_en", with: "Edited group title"
                select "Women", from: "process_issue_id"
                select "Center", from: "process_scope_id"

                click_button "Update"
              end

              assert has_message? "Process was successfully updated"

              visit admin_participation_path

              assert has_content? "Edited group title"

              group.reload

              assert_equal "Edited group title", group.title
              assert_equal "Women", group.issue.name
              assert_equal "Center", group.scope.name
            end
          end
        end
      end

      def test_update_process_adding_new_stages
        with_signed_in_admin(admin) do
          with_current_site(site) do
            visit edit_admin_participation_process_path(process)

            click_on "Stages"
            click_on "Add new stage"

            assert has_content? "Create stage"
            fill_in "process_stage_menu_translations_en", with: "New menu stage"
            fill_in "process_stage_title_translations_en", with: "New stage"
            fill_in "process_stage_description_translations_en", with: "New description"
            fill_in "process_stage_slug", with: "stage-url"

            click_button "Create"

            assert has_message? "The stage/tool has been created correctly."

            within "#stages" do
              assert has_content? "New stage"
            end
          end
        end
      end

      def test_update_process_deleting_existing_stages
        with_signed_in_admin(admin) do
          with_current_site(site) do
            visit edit_admin_participation_process_path(process)

            click_on "Stages"

            within "#process-stage-item-#{process_stage.id}" do
              find("a[data-method='delete']").click
            end

            refute process.stages.exists?(id: process_stage.id)
          end
        end
      end

      def test_update_process_editing_existing_stages
        with_signed_in_admin(admin) do
          with_current_site(site) do
            visit edit_process_stage_path

            fill_in "process_stage_title_translations_en", with: "Modified title"
            click_button "Update"

            assert has_message? "The stage/tool has been updated correctly."

            within "#stages" do
              assert has_content? "Modified title"
            end
          end
        end
      end

      def test_update_process_page_in_process_stage
        with_signed_in_admin(admin) do
          with_current_site(site) do
            visit edit_process_stage_path

            click_on "Stages"
            all("a", text: "Manage")[1].click

            within "form.edit_process_stage_page" do
              select cms_page.title, from: "process_stage_page_page_id"

              click_button "Update"
            end

            assert has_message?("The page has been associated correctly.")

            within "form.edit_process_stage_page" do
              assert has_select?("process_stage_page_page_id", selected: cms_page.title)
            end
          end
        end
      end
    end
  end
end
