# frozen_string_literal: true

module GobiertoPeople
  module PoliticalGroups
    class PeopleController < BaseController

      include PeopleClassificationHelper
      include DatesRangeHelper

      def index
        @people = @political_group.people.by_site(current_site).active.sorted
        @political_groups = get_political_groups
        set_present_groups
      end
    end
  end
end
