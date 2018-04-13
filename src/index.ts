import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as moment from 'moment';
const App = require('actions-on-google').DialogflowApp;
const ActionsSdkApp = require('actions-on-google').ActionsSdkApp;
admin.initializeApp();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const addPlan = functions.https.onRequest((request, response) => {
    console.log('starting add plan');
    const app = new App({ request, response });
    const sdkApp = new ActionsSdkApp({ request, response });

    console.log('Request headers: ' + JSON.stringify(request.headers));
    console.log('Request body: ' + JSON.stringify(request.body));



    let actionMap = new Map();
    actionMap.set('track_task', trackTask);
    actionMap.set('list_tasks', listTasks);

    app.handleRequest(actionMap);
});

function trackTask(app) {

    const task = app.getArgument('task');
    const startDate = new Date(app.getArgument('startDate'));
    const endDate = new Date(app.getArgument('endDate') as Date);

    return admin.firestore().collection('tasks')
        .add({
            task,
            startDate,
            endDate
        })
        .then(() => {
            const daysLeft = Math.floor(moment.duration(moment(endDate).diff(moment())).asDays());

            return app.ask(app.buildRichResponse()
                .addSimpleResponse(
                    `All set! I am now keeping track of the task ${task}. 
                    You have only ${daysLeft} days before the deadline. Do you want to add another task?`)
                .addBasicCard(
                    app
                        .buildBasicCard(`${daysLeft} days remaining towards deadline.`)
                        .setTitle(task)
                        .setSubtitle(`${moment(startDate).format('MMMM Do YYYY')} to ${moment(endDate).format('MMMM Do YYYY')}`)
                ));

            // return app.tell(`All set! I am now keeping track of the task ${task}. 
            // You have only ${daysLeft} days before the deadline.`);
        });

};

function listTasks(app) {
    return admin.firestore()
        .collection('tasks')
        .get()
        .then(querySnapshot => {
            let tasks = [];
            querySnapshot.forEach(doc => {
                tasks.push(doc.data());
            });

            const allTaskSpeech = tasks.map(t => formTaskSentence(t)).join();

            const carouselItems = tasks.map(t=> {
                return app.buildBrowseItem(t.task, "https://google.com")
                .setDescription(formTaskSentence(t));
            });

            return app.tell(app
                .buildRichResponse()
                .addSimpleResponse(allTaskSpeech)
                .addBrowseCarousel(
                    app
                    .buildBrowseCarousel()
                    .addItems(carouselItems))

            );
        });
}

function formTaskSentence(task) {
    const totalDays = Math.ceil(moment.duration(moment(task.endDate).diff(moment(task.startDate))).asDays());
    const daysLeft = Math.floor(moment.duration(moment(task.endDate).diff(moment())).asDays());

    const deadlinePercentage = Math.ceil((daysLeft / totalDays) * 100);


    return `${task.task} ends on ${moment(task.endDate).format('MMMM Do YYYY')}. 
    You have ${daysLeft} days left, which is ${deadlinePercentage}% towards the deadline.`;
}
