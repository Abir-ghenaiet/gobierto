# frozen_string_literal: true

module GobiertoAdmin
  module GobiertoCms
    class SectionItemsController < BaseController
      def create
        @section_item_form = SectionItemForm.new(section_id: params[:section_id],
                                                 item_type: "GobiertoCms::Page",
                                                 item_id: params[:page_id],
                                                 parent_id: 0)

        if @section_item_form.save
          track_create_activity
        end

      end

      def index
        @section = find_section

        render(
          json: { section_items: @section.section_items.without_parent.map{ |si| default_serializer.new(si) }}
        )
      end

      def destroy
        @section_item = find_section_item

        if @section_item.destroy
          track_destroy_activity
        end
      end

      def update
        @section_item = find_section_item

        @section_item_form = SectionItemForm.new(id: params[:id],
                                                 section_id: params[:section_id],
                                                 item_type: "GobiertoCms::Page",
                                                 item_id: @section_item.item.id,
                                                 parent_id: params[:parent_id],
                                                 level: params[:level],
                                                 position: params[:position]
        )
        @section_item_form.save
      end

      private

      def track_create_activity
        Publishers::GobiertoCmsSectionItemActivity.broadcast_event("section_item_created", default_activity_params.merge(subject: @section_item_form.section_item.item))
      end

      def track_destroy_activity
        Publishers::GobiertoCmsSectionItemActivity.broadcast_event("section_item_deleted", default_activity_params.merge(subject: @section_item.item))
      end

      def default_activity_params
        { ip: remote_ip, author: current_admin, site_id: current_site.id }
      end

      def ignored_issue_attributes
        %w(position created_at updated_at)
      end

      def default_serializer
        ::GobiertoAdmin::GobiertoCms::SectionItemSerializer
      end

      def find_section
        current_site.sections.find(params[:section_id])
      end

      def find_section_item
        ::GobiertoCms::SectionItem.find(params[:id])
      end
    end
  end
end
