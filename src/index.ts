import { Schedule, Day, Week, WorkWeek, Month, Agenda, PopupOpenEventArgs, ActionEventArgs } from '@syncfusion/ej2-schedule';
import { DateTimePicker } from '@syncfusion/ej2-calendars';
import { DataManager, WebApiAdaptor } from '@syncfusion/ej2-data';

Schedule.Inject(Day, Week, WorkWeek, Month, Agenda);

const CALENDAR_ID: string = process.env['CALENDAR_ID'];
const API_KEY: string = process.env['API_KEY'];
const TIME_ZONE: string = process.env['TIME_ZONE'];

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
        // IsBlock: true
      });
    }
  }
  e.result = scheduleData;
}

let dataManager: DataManager = new DataManager({
  url: 'https://www.googleapis.com/calendar/v3/calendars/' + CALENDAR_ID + '/events?key=' + API_KEY,
  adaptor: new WebApiAdaptor(),
  crossDomain: true
});

let scheduleObj: Schedule = new Schedule({
  eventSettings: {
    dataSource: dataManager,
    fields: {
      id: 'Id',
      subject: { name: 'Title', validation: { required: true } },
      location: { name: 'Location' },
      description: { name: 'Description' },
      startTime: { name: 'StartTime', validation: { required: true } },
      endTime: { name: 'EndTime', validation: { required: true } }
    }
  },
  timezone: TIME_ZONE,
  dataBinding,
  editorTemplate: '#EventEditorTemplate',
  popupOpen: (args: PopupOpenEventArgs) => {
    if (args.type === 'Editor') {
      let startElement: HTMLInputElement = args.element.querySelector('#StartTime') as HTMLInputElement;
      if (!startElement.classList.contains('e-datetimepicker')) {
        new DateTimePicker({ value: new Date(startElement.value) || new Date() }, startElement);
      }
      let endElement: HTMLInputElement = args.element.querySelector('#EndTime') as HTMLInputElement;
      if (!endElement.classList.contains('e-datetimepicker')) {
        new DateTimePicker({ value: new Date(endElement.value) || new Date() }, endElement);
      }
    }
  },
  workHours: {
    highlight: true,
    start: '09:00',
    end: '19:00'
  },
  allowKeyboardInteraction: false
});

scheduleObj.appendTo('#Schedule');
