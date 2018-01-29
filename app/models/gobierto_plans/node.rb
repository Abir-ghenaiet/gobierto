# frozen_string_literal: true

require_dependency "gobierto_plans"

module GobiertoPlans
  class Node < ApplicationRecord
    has_and_belongs_to_many :categories, dependent: :destroy, class_name: "GobiertoPlans::Category"
    has_paper_trail

    translates :name, :status
  end
end
