import { ref, reactive } from 'vue'
import { link } from './link'
import { months, getOffSetOfMonth, currnetMonthObject } from './months'
import { countries } from './countries'
import { showEventDetailsOverlay } from './eventDetailsOverlay'
import { hideEditEventOverlay } from './editEventOverlay'
import { user } from './user'
import Joi from 'joi'

export const events = ref([])

export async function fetchEvents() {
  try {
    const eventsResult = await fetch(`${link}/api/events`)
    events.value = await eventsResult.json()
  } catch (error) {
    console.error('Server did not respond to evennts: ', error)
  }
}

/**
 * returns the events for a specific day based on the filetered countries
 * @param {number} day the day to get the events for
 * @returns {array} the events for the day
 */
export function getEventsForADay(index) {
  let filteredEvents = []
  let dayInfo = currnetMonthObject.value.dates[index]
  for (let i = 0; i < dayInfo.events.length; i++) {
    const event = events.value.find((e) => e._id === dayInfo.events[i])
    if (event && countries.value[event.country].selected) {
      filteredEvents.push(event)
    }
  }
  return filteredEvents
}

export function deleteEvent(id) {
  try {
    const res = fetch(`${link}/api/removeevent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    })
    events.value = events.value.filter((e) => e._id !== id)
    showEventDetailsOverlay.value = false
  } catch (error) {
    console.error(error)
  }
}

export const sendingEvent = ref(false)
export const eventResponse = reactive({ show: false, status: null, message: null })
export const errors = reactive({
  name: null,
  description: null,
  country: null,
  date: null,
  holiday: null,
  source: null,
})
export async function addEvent(event) {
  const name = event.target['name'].value
  const description = event.target['description'].value
  const country = Number(event.target['country'].value)
  const month = Number(event.target['month'].value)
  const dayNumber = Number(event.target['day'].value)
  const holiday = event.target['holiday'].value
  const source = event.target['source'].value
  const dayIndex = Number(dayNumber) + getOffSetOfMonth(months.value[month])
  const button = event.target.querySelector('button')
  const userId = user.id
  button.disabled = true
  sendingEvent.value = true

  errors.name = null
  errors.description = null
  errors.country = null
  errors.date = null
  errors.holiday = null
  errors.source = null

  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().max(150).required(),
    country: Joi.number().min(0).max(5).required(),
    month: Joi.number().min(0).max(11).required(),
    dayNumber: Joi.number().min(0).max(31).required(),
    holiday: Joi.bool().required(),
    source: Joi.string().allow('').uri().optional(),
    userId: Joi.string().required(),
  })

  const { error } = schema.validate({ name, description, country, month, dayNumber, holiday, source, userId }, { abortEarly: false })

  if (error) {
    console.log(error.details)
    eventResponse.show = true
    eventResponse.status = false
    eventResponse.message = 'Some fields are invalid'
    button.disabled = false
    sendingEvent.value = false

    error.details.forEach((detail) => {
      errors[detail.context.key] = detail.message
    })
    return
  }

  try {
    const response = await fetch(`${link}/api/addevent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        country,
        month,
        dayNumber,
        dayIndex,
        holiday: holiday === 'true',
        source,
        userId,
      }),
    })

    eventResponse.status = true
    eventResponse.message = 'Success!'
    const _id = await response.text()

    events.value.push({ _id, name, description, country, month, dayNumber, dayIndex, holiday: holiday == 'true', source, userId })
    months.value[month].dates[dayIndex].events.push(_id)

    event.target['name'].value = ''
    event.target['description'].value = ''
    event.target['country'].value = 'default'
    event.target['source'].value = ''
    event.target['holiday'].value = 'default'
  } catch (error) {
    console.error(error)
    eventResponse.status = false
    eventResponse.message = 'Something went wrong. Please try again later.'
  }
  button.disabled = false
  sendingEvent.value = false
  eventResponse.show = true
}

export async function submitEdit(e, eventToEdit) {
  const name = e.target['name-input'].value
  const description = e.target['details-input'].value
  const month = Number(e.target['month'].value)
  const dayNumber = Number(e.target['day'].value)
  const dayIndex = Number(dayNumber) + getOffSetOfMonth(months.value[month])
  const country = Number(e.target['country'].value)
  const holiday = e.target['holiday'].value
  const source = e.target['source'].value
  const userId = eventToEdit.userId
  const _id = eventToEdit._id
  const buttons = e.target.querySelectorAll('button')

  sendingEvent.value = true
  buttons.forEach((button) => (button.disabled = true))

  errors.name = null
  errors.description = null
  errors.country = null
  errors.date = null
  errors.holiday = null
  errors.source = null

  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().max(150).required(),
    country: Joi.number().min(0).max(5).required(),
    month: Joi.number().min(0).max(11).required(),
    dayNumber: Joi.number().min(0).max(30).required(),
    holiday: Joi.bool().required(),
    source: Joi.string().allow('').uri().optional(),
    userId: Joi.string().required(),
  })

  const { error } = schema.validate({ name, description, country, month, dayNumber, holiday, source, userId }, { abortEarly: false })

  if (error) {
    console.log(error.details)
    eventResponse.show = true
    eventResponse.status = false
    eventResponse.message = 'Some fields are invalid'
    buttons.forEach((button) => (button.disabled = false))
    sendingEvent.value = false

    error.details.forEach((detail) => {
      errors[detail.context.key] = detail.message
    })
    return
  }

  try {
    const res = await fetch(`${link}/api/updateevent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        _id,
        name,
        description,
        dayNumber,
        dayIndex,
        month,
        country,
        holiday: holiday == 'true',
        source,
        userId,
      }),
    })
  } catch (err) {
    console.log(err)
  } finally {
    hideEditEventOverlay()
    buttons.forEach((button) => (button.disabled = false))
    sendingEvent.value = false

    const indexOfEvent = events.value.indexOf(eventToEdit)
    events.value[indexOfEvent] = {
      _id,
      name,
      description,
      dayNumber,
      dayIndex,
      month,
      country,
      holiday: holiday == 'true',
      source,
      userId,
    }
    const monthBefore = eventToEdit.month
    const dayIndexBefore = eventToEdit.dayIndex
    const eventsBefore = months.value[monthBefore].dates[dayIndexBefore].events
    const eventsAfter = months.value[month].dates[dayIndex].events
    if (!(monthBefore === month && dayIndexBefore === dayIndex)) {
      eventsBefore.splice(eventsBefore.indexOf(eventToEdit), 1)
      console.log(eventsBefore)
      eventsAfter.push(_id)
    }
  }
}
