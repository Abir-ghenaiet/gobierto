# frozen_string_literal: true

class GobiertoPeople::ClearImportedPersonEventsJob < ActiveJob::Base
  queue_as :default

  def perform(person)
    # Person synchronized events
    person.events.synchronized.each(&:destroy)
    person.reload

    # Person attending events from other person calendar
    person.attending_events.each do |event|
      if event.synchronized? && event.attendees.select { |a| a.person_id.present? }.length == 1 &&
         event.person_id == 0
        event.destroy
      end
    end
    person.reload

    # Person attendance to events
    person.attending_person_events.each do |attendee|
      if attendee.person_event.nil? || attendee.person_event.synchronized?
        attendee.destroy
      end
    end
  end
end
