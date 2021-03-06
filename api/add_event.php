<?php
require_once __DIR__ . '/../vendor/autoload.php';

/* load enviroment variable fromm .env */
try {
  $dotenv = Dotenv\Dotenv::create(__DIR__, '/../.env');
  $dotenv->load();
} catch (\Exception $error) {}

/* main thread */
if ($_GET['limit'] === 'yes') {
  echo json_encode([
    'code' => 403,
    'errors' => [
      'message' => 'You already have an appointment.'
    ]
  ]);
} else {
  $inputJSON = file_get_contents('php://input');
  if ($inputJSON) {
    $input = json_decode($inputJSON, true);
    $appointment = $input['appointment'];

    $standardizedAppointment = [
      'summary' => $appointment['Title'],
      'location' => isset($appointment['Location']) ? $appointment['Location'] : '',
      'description' => isset($appointment['Description']) ? $appointment['Description'] : '',
      'start' => array(
        'dateTime' => $appointment['StartTime']
      ),
      'end' => array(
        'dateTime' => $appointment['EndTime']
      )
    ];

    if (getenv('NODE_ENV') === 'production') {
      $private_key = base64_decode(getenv('GOOGLE_API_PRIVATE_KEY_BASE64'));
      $private_key = str_replace('\n', "\n", $private_key);
      $client_params = [
        'client_email'        => getenv('GOOGLE_API_CLIENT_EMAIL'),
        'signing_algorithm'   => 'HS256',
        'signing_key'         => $private_key
      ];
      $client = new Google_Client($client_params);
      $client->setClientId(getenv('GOOGLE_API_CLIENT_ID'));
    } else {
      $client = new Google_Client();
    }

    $client->useApplicationDefaultCredentials();

    if (isset($_SESSION['token'])) {
      $client->setAccessToken($_SESSION['token']);
    }
    $client->setScopes(Google_Service_Calendar::CALENDAR);

    $service = new Google_Service_Calendar($client);
    $event = new Google_Service_Calendar_Event($standardizedAppointment);
    $calendarIds = getenv('CALENDAR_IDS');
    $mainCalendarId = explode('|', $calendarIds)[0];

    try {
    $result = $service->events->insert($mainCalendarId, $event);
      echo json_encode([
        'code' => 200,
        'event' => [
          'id' => $result->id,
          'link' => $result->htmlLink
        ],
        'data' => $standardizedAppointment
      ]);
    } catch (Google_Service_Exception $error) {
      echo json_encode([
        'code' => 500,
        'errors' => $error->getErrors(),
        'data' => $standardizedAppointment
      ]);
    }
  }
}
