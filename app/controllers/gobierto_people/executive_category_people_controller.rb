module GobiertoPeople
  class ExecutiveCategoryPeopleController < PeopleController
    def index
      @person_category = Person.categories["executive"]
      super
    end
  end
end
