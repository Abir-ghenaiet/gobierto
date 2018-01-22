module GobiertoCalendars

  def self.table_name_prefix
    'gc_'
  end

  def self.searchable_models
    [ GobiertoCalendars::Event ]
  end

  def self.sync_range_start
    DateTime.now - 2.days
  end

  def self.sync_range_end
    DateTime.now + 1.year
  end

  def self.sync_range
    sync_range_start..sync_range_end
  end

end
