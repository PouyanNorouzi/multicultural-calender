<script setup>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue'

import { fetchMonths, isMonthLoaded } from './utils/months'
import { events, fetchEvents } from './utils/events'
import { user, fetchUser, loggedIn } from './utils/user'
import { currentMonth, currentDay } from './utils/currentDay'
import { loadingApp } from './utils/loading'
import { showEditEvent, eventToEdit } from './utils/editEventOverlay'

import Header from './components/AppHeader.vue'
import AccountComp from './components/AccountComp.vue'
import Calender from './components/CalenderInterface.vue'
import SideBar from './components/SideBar.vue'
import EditEvent from './components/EditEvent.vue'

const showAccountOverlay = ref(false)
const tempShowSideBar = ref(false)
const showSideBar = ref(window.innerWidth > 800)
const mobileMode = ref(window.innerWidth < 800)

const calenderStyle = reactive({})

const gridArea = reactive({ 'grid-template-columns': '15vw 85vw' })

const animateCalender = reactive({
  animate__animated: true,
  animate__slideInLeft: false,
  animate__slideInRight: false,
  stretch_animation: false,
  shrink_animation: false,
})

const animateSideBar = reactive({ slideIn_animation: false, slideOut_animation: false })

function changeMonth(newMonth) {
  if (newMonth > currentMonth.value) {
    animateCalender.animate__slideInRight = true
    animateCalender.animate__slideInLeft = false
  } else if (newMonth < currentMonth.value) {
    animateCalender.animate__slideInRight = false
    animateCalender.animate__slideInLeft = true
  }

  setTimeout(() => {
    animateCalender.animate__slideInRight = false
    animateCalender.animate__slideInLeft = false
  }, 200)

  if (newMonth < 0) newMonth = 11
  else if (newMonth > 11) newMonth = 0
  currentMonth.value = newMonth

  if (newMonth == new Date().getMonth()) currentDay.value = new Date().getDate()
  else currentDay.value = 1
}

var firstTouch = {}
var differenceX = 0
function handleCalendarTouch(e) {
  if (e.type == 'touchstart') firstTouch = e.touches[0]
  else if (e.type == 'touchmove') {
    differenceX = firstTouch.clientX - e.touches[0].clientX
    if (Math.abs(differenceX) < Math.abs(window.innerWidth / 6))
      calenderStyle.transform = `translateX(${-(firstTouch.clientX - e.touches[0].clientX)}px)`
  } else if (e.type == 'touchend') {
    differenceX = firstTouch.clientX - e.changedTouches[0].clientX
    calenderStyle.transform = 'none'
    if (differenceX > 50) {
      changeMonth(currentMonth.value + 1)
    } else if (differenceX < -50) {
      changeMonth(currentMonth.value - 1)
    }
    differenceX = 0
    firstTouch = {}
  }
}

watch(showSideBar, (newVal) => {
  if (mobileMode.value) {
    if (newVal) {
      animateSideBar.slideIn_animation = true
      setTimeout(() => {
        animateSideBar.slideIn_animation = false
      }, 200)
    } else {
      tempShowSideBar.value = true
      animateSideBar.slideOut_animation = true
      setTimeout(() => {
        tempShowSideBar.value = false
        animateSideBar.slideOut_animation = false
      }, 180)
    }
  } else {
    if (newVal) {
      animateSideBar.slideIn_animation = true
      animateCalender.shrink_animation = true
      gridArea['grid-template-columns'] = '15vw 85vw'
      setTimeout(() => {
        animateCalender.shrink_animation = false
        animateSideBar.slideIn_animation = false
      }, 200)
    } else {
      tempShowSideBar.value = true
      animateSideBar.slideOut_animation = true
      animateCalender.stretch_animation = true
      setTimeout(() => {
        tempShowSideBar.value = false
        gridArea['grid-template-columns'] = '0vw 100vw'
        animateSideBar.slideOut_animation = false
        animateCalender.stretch_animation = false
      }, 180)
    }
  }
})

function showEditEventFunc(event) {
  eventToEdit.value = event
  showEditEvent.value = true
}

onBeforeMount(async () => {
  window.addEventListener('resize', () => {
    if (window.innerWidth < 800) {
      mobileMode.value = true
      showSideBar.value = false
    } else {
      mobileMode.value = false
      showSideBar.value = true
    }
  })
  await fetchUser()
  await fetchEvents()
  await fetchMonths()
})
</script>
<template>
  <div id="container" v-if="isMonthLoaded" :style="gridArea">
    <div class="header">
      <Header v-model:showSideBar="showSideBar" @changeMonth="changeMonth" @showAccountOverlay="showAccountOverlay = true" />
    </div>

    <div
      class="calender"
      :style="calenderStyle"
      :class="animateCalender"
      @touchstart="handleCalendarTouch"
      @touchmove="handleCalendarTouch"
      @touchend="handleCalendarTouch"
      @touchcancel="handleCalendarTouch">
      <Calender @editEvent="showEditEventFunc" />
    </div>
    <div class="create-event" :class="animateSideBar" v-show="showSideBar || tempShowSideBar">
      <SideBar />
    </div>
    <div class="account-overlay" v-if="showAccountOverlay">
      <AccountComp v-model:user="user" v-model:events="events" @hideAccountOverlay="showAccountOverlay = false" />
    </div>
    <div id="edit-event" v-if="showEditEvent">
      <EditEvent :eventToEdit="eventToEdit" />
    </div>
  </div>
  <div id="loading" v-else-if="loadingApp">
    <h1>Loading...</h1>
    <svg class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
      <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
    </svg>
  </div>
  <div id="page-error" v-else>Something went wrong</div>
</template>
<style>
@import url('https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css');
.animate__animated.animate__slideInLeft {
  --animate-duration: 200ms;
}
.animate__animated.animate__slideInRight {
  --animate-duration: 200ms;
}

body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

#container {
  display: grid;
  grid-template-areas:
    'header header'
    'create-event calender';
  grid-template-rows: 8vh 92vh;
  overflow: hidden;
}

#loading {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-size: 2.5rem;
  height: 100vh;
  width: 100vw;
}

#loading > * {
  margin: 50px;
}

#page-error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  font-size: 3rem;
}

.header {
  grid-area: header;
  display: flex;
  width: 100vw;
  height: 8vh;
  /* order: 1; */
  background-color: #f0f0f0;
  justify-content: center;
  align-items: center;
}

.calender {
  grid-area: calender;
  width: 100%;
  height: 100%;
}

.create-event {
  grid-area: create-event;
  width: 100%;
  height: 100%;
  background-color: white;
}

.account-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.5);
  width: 100vw;
  height: 100vh;
  z-index: 1002;
}

#edit-event {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.5);
  width: 100vw;
  height: 100vh;
  z-index: 1003;
}

.error {
  width: fit-content;
  margin-top: 5px;
  color: red;
}

@keyframes stretchCalendar {
  0% {
  }
  100% {
    transform: scaleX(1.176470588);
  }
}

@keyframes slideSide {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes increace-size {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.05);
  }
}

.stretch_animation {
  transform-origin: right;
  animation: 200ms linear stretchCalendar;
}
.shrink_animation {
  transform-origin: right;
  animation: 200ms linear reverse stretchCalendar;
}

.slideIn_animation {
  animation: 200ms linear slideSide;
}
.slideOut_animation {
  animation: 190ms linear reverse slideSide;
}

button:hover {
  animation: 200ms forwards increace-size;
}

@media screen and (max-width: 800px) {
  #container {
    grid-template-areas:
      'header header'
      'calender calender';
  }
  .create-event {
    position: absolute;
    width: 50vw;
    top: 8vh;
  }
}
</style>
