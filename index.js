#!/usr/bin/env node

'use strict';


/*
 * Imports
 */

const studentTimetable = require('ul-timetable').studentTimetable;
const Day = require('ul-timetable').Day;


/*
 * Globals
 */

const weekPattern = /^([1-9]|1[0-3])$/;     // validates a week number
const studentIdPattern = /^([0-9]{7,8})$/;  // validates a UL student ID
const fromHour = 9;                         // first available slot starts at 09:00
const toHour = 18;                          // last available slot finishes at 18:00
const daysInWeek = 5;                       // 5 to ignore Saturday timetables, 6 otherwise


/*
 * Utility functions
 */

// Converts a slot time to an hour index.
const timeToIndex = (time) => parseInt(time.split(':')[0], 10) - fromHour;

// Converts an hour index to a 24-hour clock time.
const indexToTime = (index) => (index + fromHour).toString().padStart(2, 0) + ':00';

// Returns an array of invalid student IDs from the input array.
const findInvalidStudentIds = (ids) => ids.filter(id => !studentIdPattern.test(id));

// Counts the number of truthy elements in the input array.
const trueCount  = (array) => array.filter(element => element).length;

// Counts the number of available slots remaining.
const countAvailableSlots = (slots) => slots.reduce((prev, curr) => prev + trueCount(curr), 0);


/*
 * Arguments
 */

// Validate week number input
const week = process.argv[2];
if (!weekPattern.test(week)) {
    console.log(`Invalid week number: ${week}`);
    process.exit(1);
}

// Validate student ID input
const studentIds = process.argv.slice(3);   // all remaining command-line arguments
const invalidIds = findInvalidStudentIds(studentIds);
if (invalidIds.length) {
    for (const id of invalidIds) {
        console.log(`Invalid student ID: ${id}`);
    }
    process.exit(1);
}


/*
 * Main algorithm
 */

(async () => {
    // Create 2D array to represent available slots per day
    const slotsPerDay = toHour - fromHour;
    const slots = new Array(daysInWeek).fill(null).map(() => new Array(slotsPerDay).fill(true));

    // Query each student's timetable and update available slots
    let idCount = 0;
    for (const id of studentIds) {
        console.log(`Querying week ${week} timetable for student ${id}... (${++idCount}/${studentIds.length})`);

        // Query timetable
        const timetable = await studentTimetable(id);

        // Iterate over lessons and set those slots to false
        for (let day = 0; day < daysInWeek; day++) {
            // Filter lessons by week number
            const lessons = timetable.lessons[day].filter(lesson => lesson.weekIds.includes(week));

            // Mark conflicting slots as unavailable
            for (const lesson of lessons) {
                const fromIndex = timeToIndex(lesson.fromTime);
                const toIndex = timeToIndex(lesson.toTime);
                for (let i = fromIndex; i < toIndex; i++) {
                    slots[day][i] = false;
                }
            }
        }
        
        // Exit if there are no free slots remaining
        const availableSlots = countAvailableSlots(slots);
        console.log(`Available slots: ${availableSlots}`);
        if (!availableSlots) {
            process.exit();
        }
    }

    // Print available slot times
    console.log(`Final available slots: ${countAvailableSlots(slots)}`);
    for (let day = 0; day < daysInWeek; day++) {
        for (let slot = 0; slot < slotsPerDay; slot++) {
            if (slots[day][slot]) {
                console.log(`${Day[day]}, ${indexToTime(slot)}-${indexToTime(slot + 1)}`);
            }
        }
    }

})();
