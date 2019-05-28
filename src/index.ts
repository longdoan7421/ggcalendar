import { Schedule, Day, Week, WorkWeek, Month, Agenda, PopupOpenEventArgs, ActionEventArgs } from '@syncfusion/ej2-schedule';
import { DateTimePicker, DatePicker, TimePicker, RenderDayCellEventArgs } from '@syncfusion/ej2-calendars';
import { DataManager, WebApiAdaptor } from '@syncfusion/ej2-data';
import axios from 'axios';
const moment = require('moment-timezone');

Schedule.Inject(Day, Week, WorkWeek, Month, Agenda);

console.log({ env: process.env });
const CALENDAR_ID: string = process.env['CALENDAR_ID'];
const API_KEY: string = process.env['API_KEY'];
const TIME_ZONE: string = process.env['TIME_ZONE'];
const START_HOUR: string = process.env['START_HOUR'] || '08:00';
const END_HOUR: string = process.env['END_HOUR'] || '18:00';

let dataManager: DataManager = new DataManager({
  url: 'https://www.googleapis.com/calendar/v3/calendars/' + CALENDAR_ID + '/events?key=' + API_KEY,
  adaptor: new WebApiAdaptor(),
  crossDomain: true
});

let scheduleObj: Schedule = new Schedule({
  height: '800px',
  allowKeyboardInteraction: false,
  allowDragAndDrop: false,
  editorTemplate: '#EventEditorTemplate',
  views: ['Week'],
  dataBinding,
  eventSettings: {
    enableTooltip: true,
    dataSource: dataManager,
    fields: {
      id: 'Id',
      subject: { name: 'Title', validation: { required: true } },
      location: { name: 'Location' },
      description: { name: 'Description' },
      startTime: { name: 'StartTime', validation: { required: true } }
    }
  },
  timezone: TIME_ZONE,
  workHours: {
    highlight: true,
    start: START_HOUR,
    end: END_HOUR
  },
  workDays: [1, 2, 3, 4, 5],
  showWeekend: false,
  startHour: START_HOUR,
  endHour: END_HOUR,
  timeScale: {
    slotCount: 1
  },
  popupOpen: (args: PopupOpenEventArgs) => {
    if (args.type === 'Editor') {
      let startTimeElement: HTMLInputElement = args.element.querySelector('#StartTime') as HTMLInputElement;
      let startTimeWithoutDateElement: HTMLInputElement = args.element.querySelector('#StartTimeWithoutDate') as HTMLInputElement;
      const selectedTime = startTimeElement.value;

      if (!startTimeElement.classList.contains('e-datepicker')) {
        new DatePicker({
          strictMode: true,
          value: new Date(selectedTime) || new Date(),
          renderDayCell: setDisabledDate,
        }, startTimeElement);
      }

      if (!startTimeWithoutDateElement.classList.contains('e-timepicker')) {
        new TimePicker({
          strictMode: true,
          min: new Date('3/8/2017 8:00 AM'),
          max: new Date('3/8/2017 6:00 PM'),
          value: new Date(selectedTime) || new Date(),
          step: 15
        }, startTimeWithoutDateElement);
      }
    }
  },
  actionBegin: (args: ActionEventArgs) => {
    if (args.requestType === 'eventCreate') {
      args.cancel = true;
      toggleSpinner('on');
      createAppointment(args.data);
    }
  }
});

scheduleObj.appendTo('#Schedule');

/*************************************************************************************************************************************
 *                                                             Function                                                               *
 *************************************************************************************************************************************/
function dataBinding(e: { [key: string]: Object }): void {
  let items: { [key: string]: Object }[] = (e.result as { [key: string]: Object }).items as { [key: string]: Object }[];
  let scheduleData: Object[] = [];
  if (items.length > 0) {
    for (let i: number = 0; i < items.length; i++) {
      let event: { [key: string]: Object } = items[i];
      let when: string = (event.start as { [key: string]: Object }).dateTime as string;
      let start: string = (event.start as { [key: string]: Object }).dateTime as string;
      let end: string = (event.end as { [key: string]: Object }).dateTime as string;
      if (!when) {
        when = (event.start as { [key: string]: Object }).date as string;
        start = (event.start as { [key: string]: Object }).date as string;
        end = (event.end as { [key: string]: Object }).date as string;
      }
      scheduleData.push({
        Id: event.id,
        Title: event.summary || 'Busy',
        StartTime: new Date(start),
        EndTime: new Date(end),
        Location: event.location || '',
        Description: event.description || '',
        IsAllDay: !(event.start as { [key: string]: Object }).dateTime,
        IsReadonly: true,
        IsBlock: true
      });
    }
  }
  e.result = scheduleData;
}

function createAppointment(events: object): void {
  let event = events[0];
  let startTime = convertToTimeZone(event['StartTime'], event['StartTimeWithoutDate'], TIME_ZONE);
  let endTime = moment(startTime)
    .add(1, 'h')
    .tz(TIME_ZONE)
    .format();

  let appointment = Object.assign({}, event, {
    StartTime: startTime,
    EndTime: endTime
  });

  axios
    .post('/api/add_event.php', {
      appointment
    })
    .then(response => {
      if (response.data && response.data.code === 200) {
        scheduleObj.refreshEvents();
        return;
      }

      if (response.data && response.data.code === 500) {
        console.log(response.data.errors);
        alert('Cannot create appointment.');
        return;
      }

      throw new Error('Response invalid');
    })
    .then(() => {
      toggleSpinner('off');
    })
    .catch(error => {
      console.log({ error });
      toggleSpinner('off');
      alert('There is something wrong with server. Please try again later.');
    });
}

function toggleSpinner(mode: string): void {
  if (mode === 'on') {
    scheduleObj.showSpinner();
    // document.getElementById('loader').style.display = 'block';
  } else {
    scheduleObj.hideSpinner();
    // document.getElementById('loader').style.display = 'none';
  }
}

function convertToTimeZone(date: Date, time: string, timeZone: string = TIME_ZONE): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let dateTimeWithTz = moment.tz(`${year}-${month}-${day} ${time}`, 'YYYY-M-D h:mm a', timeZone);
  return dateTimeWithTz.format();
}

function setDisabledDate(args: RenderDayCellEventArgs): void {
  if (args.date.getDay() === 0 || args.date.getDay() === 6) {
    args.isDisabled = true;
  }
}
