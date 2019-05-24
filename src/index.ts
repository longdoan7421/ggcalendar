import { Schedule, Day, Week, WorkWeek, Month, Agenda, PopupOpenEventArgs, ActionEventArgs } from '@syncfusion/ej2-schedule';
import { DateTimePicker, RenderDayCellEventArgs } from '@syncfusion/ej2-calendars';
import { DataManager, WebApiAdaptor } from '@syncfusion/ej2-data';
import axios from 'axios';
const moment = require('moment-timezone');

Schedule.Inject(Day, Week, WorkWeek, Month, Agenda);

console.log({ env: process.env });
const CALENDAR_ID: string = process.env['CALENDAR_ID'];
const API_KEY: string = process.env['API_KEY'];
const TIME_ZONE: string = process.env['TIME_ZONE'];

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
  views: ['Week', 'Agenda'],
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
      // endTime: { name: 'EndTime', validation: { required: true } }
    }
  },
  timezone: TIME_ZONE,
  workHours: {
    highlight: true,
    start: '08:00',
    end: '18:00'
  },
  workDays: [1, 2, 3, 4, 5],
  showWeekend: false,
  startHour: '08:00',
  endHour: '18:00',
  timeScale: {
    slotCount: 1
  },
  popupOpen: (args: PopupOpenEventArgs) => {
    if (args.type === 'Editor') {
      let startElement: HTMLInputElement = args.element.querySelector('#StartTime') as HTMLInputElement;
      if (!startElement.classList.contains('e-datetimepicker')) {
        new DateTimePicker(
          {
            strictMode: true,
            value: new Date(startElement.value) || new Date(),
            step: 15,
            renderDayCell: setDisabledDate
          },
          startElement
        );
      }
      // let endElement: HTMLInputElement = args.element.querySelector('#EndTime') as HTMLInputElement;
      // if (!endElement.classList.contains('e-datetimepicker')) {
      //   new DateTimePicker({ value: new Date(endElement.value) || new Date() }, endElement);
      // }
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
function toggleSpinner(mode: string): void {
  if (mode === 'on') {
    scheduleObj.showSpinner();
    // document.getElementById('loader').style.display = 'block';
  } else {
    scheduleObj.hideSpinner();
    // document.getElementById('loader').style.display = 'none';
  }
}

function convertToTimeZone(date: Date, timeZone: string = TIME_ZONE): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();

  let dateTimeWithTz = moment.tz(`${year}-${month}-${day} ${hour}:${minute}`, 'YYYY-M-D H:m', timeZone);
  return dateTimeWithTz.format();
}

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
  let startTime = convertToTimeZone(event['StartTime'], TIME_ZONE);
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
function setDisabledDate(args: RenderDayCellEventArgs): void {
  /*Date need to be disabled*/
  if (args.date.getDay() === 0 || args.date.getDay() === 6) {
    args.isDisabled = true;
  }
}
