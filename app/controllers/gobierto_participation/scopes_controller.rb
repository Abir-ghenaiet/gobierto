# frozen_string_literal: true

module GobiertoParticipation
  class ScopesController < GobiertoParticipation::ApplicationController
    def index
      @scopes = current_site.scopes
    end

    def show
      @scope = find_scope
      @scope_news = find_scope_news
      @scope_notifications = find_scope_notifications
      @scope_events = find_scope_events
      @processes = current_site.processes.process.where(scope: @scope).active
      @groups = CollectionDecorator.new(find_groups, decorator: GobiertoParticipation::ProcessDecorator)
    end

    private

    def find_groups
      current_site.processes.group_process.where(scope: @scope).active
    end

    def find_scope
      current_site.scopes.find_by!(slug: params[:id])
    end

    def find_scope_news
      @scope.active_pages.limit(5)
    end

    def find_scope_notifications
      ActivityCollectionDecorator.new(Activity.in_site(current_site)
                                 .no_admin
                                 .in_process(@scope.processes)
                                 .sorted
                                 .limit(5)
                                 .includes(:subject, :author, :recipient)
                                 .page(params[:page]))
    end

    def find_scope_events
      @scope.events.published.upcoming.order(starts_at: :asc).limit(5)
    end
  end
end
