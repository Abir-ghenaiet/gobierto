module GobiertoPeople
  module People
    class PersonPostsController < BaseController

      include PreviewTokenHelper

      def index
        @posts = @person.posts.active.sorted
      end

      def show
        @post = find_post
      end

      private

      def find_post
        person_posts_scope.find_by!(slug: params[:slug])
      end

      def person_posts_scope
        valid_preview_token? ? @person.posts.draft : @person.posts.active
      end

    end
  end
end
