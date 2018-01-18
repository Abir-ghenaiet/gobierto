# frozen_string_literal: true

require_dependency "gobierto_participation"

module GobiertoParticipation
  class ContributionContainer < ApplicationRecord
    acts_as_paranoid column: :archived_at

    include ActsAsParanoidAliases
    include User::Subscribable
    include GobiertoCommon::Sluggable
    include GobiertoCommon::HasVisibilityUserLevels

    translates :title, :description

    belongs_to :site
    belongs_to :process
    belongs_to :admin, class_name: "GobiertoAdmin::Admin"
    has_many :contributions

    after_restore :set_slug

    enum visibility_level: { draft: 0, active: 1 }
    enum contribution_type: { idea: 0, question: 1, proposal: 2 }

    scope :open, -> { where("gpart_contribution_containers.starts <= ?
                             AND gpart_contribution_containers.ends >= ?", Time.zone.now, Time.zone.now) }
    scope :by_site, -> (site) { joins(process: :site).where("sites.id = ? AND gpart_processes.visibility_level = 1
                                                             AND gpart_contribution_containers.visibility_level = 1
                                                             AND gpart_contribution_containers.ends >= ?",
                                                             site.id, Time.zone.now) }

    validates :site, :process, :title, :description, :admin, presence: true

    def parameterize
      { slug: slug }
    end

    def attributes_for_slug
      [title]
    end

    def comments_count
      contributions.sum(:comments_count)
    end

    def participants_count
      contributions.sum(&:number_participants)
    end

    def days_left
      (ends - Date.current).to_i
    end

    def restore_slug
      send(:set_slug)
    end
  end
end
