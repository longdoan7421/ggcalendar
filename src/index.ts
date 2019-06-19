import { Schedule, Day, Week, WorkWeek, Month, Agenda, PopupOpenEventArgs, ActionEventArgs } from '@syncfusion/ej2-schedule';
import { DatePicker, TimePicker, RenderDayCellEventArgs } from '@syncfusion/ej2-calendars';
import { DataManager, WebApiAdaptor, ReturnOption, Query } from '@syncfusion/ej2-data';
import axios from 'axios';
import { isEmpty } from 'lodash';
const moment = require('moment-timezone');

Schedule.Inject(Day, Week, WorkWeek, Month, Agenda);

const CALENDAR_IDS: string[] = (process.env['CALENDAR_IDS'] as string).split('|');
const API_KEY: string = process.env['API_KEY'];
const SCHEDULE_TIME_ZONE: string = process.env['SCHEDULE_TIME_ZONE'];
const START_HOUR: string = convertToLocalTime(process.env['START_HOUR'] || '08:00', SCHEDULE_TIME_ZONE, 'HH:mm', 'HH:mm');
const END_HOUR: string = convertToLocalTime(process.env['END_HOUR'] || '18:00', SCHEDULE_TIME_ZONE, 'HH:mm', 'HH:mm');
const alreadyHasAppointment = new URLSearchParams(window.location.search).get('limit') === 'yes';
const userTimezone = moment.tz.guess(true);

let scheduleObj: Schedule;
const dataSource: Object[] = [];
fetchEvents().then((fetchResult): void => {
  initialSchedule(fetchResult);
});

/*--------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------- Function -----------------------------------------------*/
/*--------------------------------------------------------------------------------------------------------*/
function initialSchedule(fetchResult: boolean): void {
  scheduleObj = new Schedule({
    height: '800px',
    allowKeyboardInteraction: false,
    allowDragAndDrop: false,
    editorTemplate: '#EventEditorTemplate',
    views: ['Week'],
    readonly: !fetchResult,
    dataBinding: dataBinding,
    eventSettings: {
      enableTooltip: true,
      dataSource: new DataManager(dataSource),
      fields: {
        id: 'Id',
        subject: { name: 'Title', validation: { required: true } },
        location: { name: 'Location' },
        description: { name: 'Description' },
        startTime: { name: 'StartTime', validation: { required: true } },
        endTime: { name: 'EndTime' }
      }
    },
    // timezone: SCHEDULE_TIME_ZONE,
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
    popupOpen: (args: PopupOpenEventArgs): void => {
      if (args.type === 'Editor') {
        editCustomTemplate(args);
      }
    },
    actionBegin: (args: ActionEventArgs): void => {
      if (args.requestType === 'eventCreate') {
        args.cancel = true;
        toggleSpinner('on');
        createAppointment(args.data);
      }
    }
  });

  scheduleObj.appendTo('#Schedule');
}

function fetchEvents(): Promise<boolean> {
  let requests = CALENDAR_IDS.map((calendarId: string): Promise<ReturnOption> => {
    return new Promise((resolve, reject): void => {
      new DataManager({
        url: ['https://www.googleapis.com/calendar/v3/calendars/', encodeURIComponent(calendarId), '/events?key=', API_KEY, '&timeZone=', userTimezone].join(''),
        adaptor: new WebApiAdaptor(),
        crossDomain: true
      })
        .executeQuery(new Query())
        .then((response: ReturnOption): void => {
          resolve(response);
        })
        .catch((err): void => {
          console.log(`Get events from calendar ${calendarId} failed.`);
          if (!isEmpty(err)) reject(err);
        });
    });
  });

  return Promise.all(requests)
    .then((responses: { [key: string]: Object }[]): boolean => {
      dataSource.length = 0; // remove old elements
      responses.forEach((response): void => {
        const { result } = response;
        dataSource.push(result);
      });

      return true;
    })
    .catch((err): boolean => {
      console.log('Fetch events error', JSON.stringify(err));
      alert('Cannot fetch events from google calendar');
      return false;
    });
}

function dataBinding(data: { [key: string]: Object | Object[] }): void {
  let scheduleData: Object[] = [];
  let calendarResults: { [key: string]: Object }[] = data.result as { [key: string]: Object }[];
  calendarResults.forEach((calendarResult): void => {
    let items: { [key: string]: Object }[] = calendarResult.items as { [key: string]: Object }[];
    if (items.length > 0) {
      for (let i = 0; i < items.length; i++) {
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
          StartTime: moment(start).format(),
          EndTime: moment(end).format(),
          Location: event.location || '',
          Description: event.description || '',
          IsAllDay: !(event.start as { [key: string]: Object }).dateTime,
          IsReadonly: true,
          IsBlock: true
        });
      }
    }
  });

  data.result = scheduleData;
}

function editCustomTemplate(args: PopupOpenEventArgs): void {
  let startTimeElement: HTMLInputElement = args.element.querySelector('#StartTime') as HTMLInputElement;
  let startTimeWithoutDateElement: HTMLInputElement = args.element.querySelector('#StartTimeWithoutDate') as HTMLInputElement;
  const selectedTime = startTimeElement.value;

  if (!startTimeElement.classList.contains('e-datepicker')) {
    new DatePicker({
      strictMode: true,
      format: 'dd/MM/yyyy',
      value: new Date(selectedTime) || new Date(),
      renderDayCell: setDisabledDate,
    }, startTimeElement);
  }

  if (!startTimeWithoutDateElement.classList.contains('e-timepicker')) {
    const startHour = START_HOUR;
    const endHour = moment(END_HOUR, 'HH:mm').subtract(1, 'h').format('HH:mm');
    new TimePicker({
      strictMode: true,
      format: 'HH:mm',
      min: new Date(['3/5/2019', startHour].join(' ')),
      max: new Date(['3/5/2019', endHour].join(' ')),
      value: new Date(selectedTime) || new Date(),
      step: 15
    }, startTimeWithoutDateElement);
  }
}

function createAppointment(argsData: object): void {
  const event = argsData[0];

  const startYear = event['StartTime'].getFullYear();
  const startMonth = event['StartTime'].getMonth() + 1;
  const startDay = event['StartTime'].getDate();

  let startTime;
  if (event['StartTimeWithoutDate']) {
    startTime = moment(`${startYear}-${startMonth}-${startDay} ${event['StartTimeWithoutDate']}`, 'YYYY-M-D HH:mm');
  } else {
    const startHour = event['StartTime'].getHours();
    const startMinute = event['StartTime'].getMinutes();
    startTime = moment(`${startYear}-${startMonth}-${startDay} ${startHour}:${startMinute}`, 'YYYY-M-D H:m');
  }
  let endTime = startTime.clone().add(1, 'h');

  const appointment = Object.assign({}, event, {
    StartTime: startTime.format(),
    EndTime: endTime.format()
  });

  const url = alreadyHasAppointment ? '/api/add_event.php?limit=yes' : '/api/add_event.php';
  axios
    .post(url, { appointment })
    .then((response): void => {
      if (response.data) {
        switch (response.data.code) {
          case 200:
            fetchEvents()
              .then((): void => scheduleObj.refreshEvents())
              .catch((): void => console.log('Refresh events failed'));
            return;
          case 403:
            console.log({ error: response.data.errors });
            alert(response.data.errors.messagge || 'You already have an appointment.');
            return;
          case 500:
            console.log({ error: response.data.errors });
            alert('Cannot create appointment.');
            return;
          default:
            break;
        }
      }

      throw new Error('Response invalid');
    })
    .then((): void => {
      toggleSpinner('off');
    })
    .catch((error): void => {
      console.log({ error });
      toggleSpinner('off');
      alert('There is something wrong with server. Please try again later.');
    });
}

function setDisabledDate(args: RenderDayCellEventArgs): void {
  if (args.date.getDay() === 0 || args.date.getDay() === 6) {
    args.isDisabled = true;
  }
}

/*-------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------- Helpers -----------------------------------------------*/
/*-------------------------------------------------------------------------------------------------------*/
function toggleSpinner(mode: string): void {
  if (mode === 'on') {
    scheduleObj.showSpinner();
    // document.getElementById('loader').style.display = 'block';
  } else {
    scheduleObj.hideSpinner();
    // document.getElementById('loader').style.display = 'none';
  }
}

function convertToLocalTime(date: string, timeZone: string, format: string, returnFormat: string = ''): string {
  return moment.tz(date, format, timeZone).local().format(returnFormat);
}
