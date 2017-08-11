# frozen_string_literal: true

require "test_helper"

class GobiertoBudgets::ExecutionPpageTest < ActionDispatch::IntegrationTest
  def setup
    super
    @path = gobierto_budgets_budgets_execution_path(last_year)
  end

  def site
    @site ||= sites(:madrid)
  end

  def last_year
    2016
  end

  def test_execution_information
    with_current_site(site) do
      visit @path

      assert has_content?("Budget execution")
    end
  end
end
