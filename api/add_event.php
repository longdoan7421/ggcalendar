<?php
  require_once __DIR__.'/../vendor/autoload.php';

  session_start();

  $dotenv = Dotenv\Dotenv::create(__DIR__, '/../.env');
  $dotenv->load();

  $inputJSON = file_get_contents('php://input');
  if ($inputJSON) {
    $appointments = json_decode($inputJSON, true);

    $newAppointment = [];
    foreach ($appointments as $appointment) {
      $newAppointment = array(
        'summary' => $appointment['Title'],
        'location' => isset($appointment['Location']) ? $appointment['Location'] : '',
        'description' => isset($appointment['Description']) ? $appointment['Description'] : '' ,
        'start' => array(
          'dateTime' => date('c', strtotime($appointment['StartTime']))
        ),
        'end' => array(
          'dateTime' => date('c', strtotime($appointment['EndTime']))
        )
      );
    }

    $client = new Google_Client();
    if (isset($_SESSION['token'])) {
      $client->setAccessToken($_SESSION['token']);
     }
    $client->setScopes(Google_Service_Calendar::CALENDAR);
    $client->useApplicationDefaultCredentials();

    $service = new Google_Service_Calendar($client);
    $event = new Google_Service_Calendar_Event($newAppointment);
    $calendarId = getenv('CALENDAR_ID');

    $result = $service->events->insert($calendarId, $event);
  }
?>