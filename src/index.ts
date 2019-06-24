import { Schedule, Day, Week, WorkWeek, Month, Agenda, PopupOpenEventArgs, ActionEventArgs } from '@syncfusion/ej2-schedule';
import { DatePicker, TimePicker, RenderDayCellEventArgs } from '@syncfusion/ej2-calendars';
import { DataManager, WebApiAdaptor, ReturnOption, Query } from '@syncfusion/ej2-data';
import axios from 'axios';
import { isEmpty } from 'lodash';
import { ISO_8601 } from 'moment';
import moment = require('moment-timezone');

Schedule.Inject(Day, Week, WorkWeek, Month, Agenda);

const CALENDAR_IDS: string[] = (process.env['CALENDAR_IDS'] as string).split('|');
const API_KEY: string = process.env['API_KEY'];
const SCHEDULE_TIME_ZONE: string = process.env['SCHEDULE_TIME_ZONE'];
const START_HOUR: string = convertToLocalTime(process.env['START_HOUR'] || '08:00', SCHEDULE_TIME_ZONE, 'HH:mm', 'HH:mm');
const END_HOUR: string = convertToLocalTime(process.env['END_HOUR'] || '18:00', SCHEDULE_TIME_ZONE, 'HH:mm', 'HH:mm');
const alreadyHasAppointment = new URLSearchParams(window.location.search).get('limit') === 'yes';
const userTimezone = moment.tz.guess(true);

let scheduleObj: Schedule;
let dataSource: Object[] = [];
fetchEvents().then((fetchResult): void => {
  initialSchedule(fetchResult);
});

/*--------------------------------------------------------------------------------------------------------*/
/*----------------------------------------------- Function -----------------------------------------------*/
/*--------------------------------------------------------------------------------------------------------*/
function initialSchedule(fetchResult: boolean): void {
  console.log({dataSource});
  scheduleObj = new Schedule({
    height: '800px',
    allowKeyboardInteraction: false,
    allowDragAndDrop: false,
    editorTemplate: '#EventEditorTemplate',
    views: ['Week'],
    readonly: !fetchResult,
    dataBinding: bindEventsToSchedule,
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
        createAppointment(args.data).then((): void => toggleSpinner('off'));
      }
    }
  });

  scheduleObj.appendTo('#Schedule');
}

function fetchEvents(): Promise<boolean> {
  const timeMin: string = moment().subtract(2, 'M').format();
  let requests = CALENDAR_IDS.map((calendarId: string): Promise<ReturnOption> => {
    return new Promise((resolve, reject): void => {
      new DataManager({
        url: [
          'https://www.googleapis.com/calendar/v3/calendars/',
          encodeURIComponent(calendarId),
          '/events?key=',
          API_KEY,
          '&timeZone=',
          encodeURIComponent(userTimezone),
          '&timeMin=',
          encodeURIComponent(timeMin),
          '&maxResults=2500',
          '&singleEvents=true'
        ].join(''),
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

function bindEventsToSchedule(data: { [key: string]: Object | Object[] }): void {
  try {
    let scheduleData: Object[] = [];
    let calendarResults: { [key: string]: Object }[] = data.result as { [key: string]: Object }[];
    calendarResults.forEach((calendarResult): void => {
      let items: { [key: string]: Object }[] = calendarResult.items as { [key: string]: Object }[];
      if (items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          let event: { [key: string]: Object } = items[i];
          let start: { [key: string]: Object } = event.start as { [key: string]: Object };
          let end: { [key: string]: Object } = event.end as { [key: string]: Object };
          if (!start || !end) {
            continue;
          }

          let startTime: string = start.dateTime as string;
          let endTime: string = end.dateTime as string;
          let isAllDay = !startTime;
          if (isAllDay) {
            startTime = start.date as string;
            endTime = end.date as string;
          }

          scheduleData.push({
            Id: event.id,
            Title: event.summary || 'Busy',
            StartTime: moment(startTime).format(),
            EndTime: moment(endTime).format(),
            Location: event.location || '',
            Description: event.description || '',
            IsAllDay: isAllDay,
            IsReadonly: true,
            IsBlock: true
          });
        }
      }
    });

    data.result = scheduleData;
  } catch (error) {
    console.log(`Binding data error: ${error}`);
  }
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

async function createAppointment(argsData: object): Promise<boolean> {
  const event: Object = argsData[0];
  const appointment: Object = formatEvent(event);
  const validationErrors: string[] = validateAppointment(appointment);
  if (validationErrors.length) {
    alert(validationErrors.join('\n'));
    return false;
  }

  const submitResult: boolean = await submitAppointment(appointment);
  return submitResult;
}

function formatEvent(event: Object): Object {
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

  return appointment;
}

function validateAppointment(appointment: Object): string[] {
  let errors = [];

  const startTime = moment(appointment['StartTime'], ISO_8601);
  const validationTime = moment().add(30, 'm');
  if (!startTime || startTime.isBefore(validationTime)) {
    errors.push('Please select a date time at least 30 minutes from now');
  }

  return errors;
}

async function submitAppointment(appointment: Object): Promise<boolean> {
  const url = alreadyHasAppointment ? '/api/add_event.php?limit=yes' : '/api/add_event.php';
  return axios
    .post(url, { appointment })
    .then((response): boolean => {
      if (response.data) {
        switch (response.data.code) {
          case 200:
            fetchEvents()
              .then((): void => scheduleObj.refreshEvents())
              .catch((): void => console.log('Refresh events failed'));
            return true;
          case 403:
            console.log({ error: response.data.errors });
            alert(response.data.errors.messagge || 'You already have an appointment.');
            return true;
          case 500:
            console.log({ error: response.data.errors });
            alert('Cannot create appointment.');
            return true;
          default:
            break;
        }
      }

      throw new Error('Response invalid');
    })
    .catch((error): boolean => {
      console.log({ error });
      alert('There is something wrong with server. Please try again later.');
      return false;
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
