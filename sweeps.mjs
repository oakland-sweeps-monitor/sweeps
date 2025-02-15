import { appendToList } from './utils.mjs';

const mode = {
    OPERATION: 'Operation',
    INTERVENTION: 'Intervention'
}

function createOperation(when, where, what) {
    return {
        when: when,
        where: where,
        what: what
    };
}

const updatedDateRegex = /Updated (\d+\/\d+\/\d+)/;
const removeNumberRegex = /^\d+\./;

function createIntervention(dayOfWeek, where, what) {
    var pileRemoval = false;
    var garbageCart = false;
    var portaPotty = false;
    var washStations = false;
    var abandonedAuto = false;

    const interventions = what.split(';');
    for(const invervention of interventions) {
        switch(invervention.trim()) {
            case 'PR':
                pileRemoval = true;
                break;
            case 'GCS':
                garbageCart = true;
                break;
            case 'PP':
                portaPotty = true;
                break;
            case 'WS':
                washStations = true;
                break;
            case 'AA':
                abandonedAuto = true;
                break;
        }
    }

    return {
        dayOfWeek: dayOfWeek,
        where: where.replace(removeNumberRegex, '').trim(),
        pileRemoval,
        garbageCart,
        portaPotty,
        washStations,
        abandonedAuto
    };
}

export function buildSchedule(rows) {
    const final = 
        rows.reduce((scheduleBuilder, row) => {
            if (row.items.length <= 0 
                || row.items[0].text === 'CITY OF OAKLAND'
                || row.items[0].text.includes('HOMELESS ENCAMPMENT CLEAN-UP SCHEDULE')
            ) {
                return scheduleBuilder;
            }

            if (
                row.items[0].text.includes('The schedule is created in advance and posted weekly, no later than Monday.')
            ) {
                const matches = updatedDateRegex.exec(row.items[0].text);
                return {
                    currentMode: scheduleBuilder.currentMode,
                    currentDayOfWeek: scheduleBuilder.currentDayOfWeek,
                    schedule: {
                        operations: scheduleBuilder.schedule.operations,
                        interventions: scheduleBuilder.schedule.interventions,
                        updatedDate: matches[1]
                    }
                };
            }

            if (row.items[0].text === 'UPCOMING OPERATIONS') {
                return { 
                    currentMode: mode.OPERATION, 
                    currentDayOfWeek: scheduleBuilder.currentDayOfWeek, 
                    schedule: scheduleBuilder.schedule 
                };
            }

            if (scheduleBuilder.currentMode === mode.OPERATION 
                && row.items.length == 4) {

                const when = row.items[0].text;
                //2 item is day of week
                const where = row.items[2].text;
                const what = row.items[3].text;
                const operation = createOperation(when, where, what);

                return { 
                    currentMode: scheduleBuilder.currentMode, 
                    currentDayOfWeek: scheduleBuilder.currentDayOfWeek, 
                    schedule: { 
                        operations: appendToList(scheduleBuilder.schedule.operations, operation), 
                        interventions: scheduleBuilder.schedule.interventions,
                        updatedDate: scheduleBuilder.schedule.updatedDate 
                    } 
                };
            }

            if (row.items.length === 3 && row.items[2].text === 'Intervention') {
                return { currentMode: mode.INTERVENTION, schedule: scheduleBuilder.schedule };
            }

            if (scheduleBuilder.currentMode === mode.INTERVENTION && row.items.length === 3) {
                const dayOfWeek = row.items[0].text;
                const intervention = createIntervention(dayOfWeek, row.items[1].text, row.items[2].text);

                return { 
                    currentMode: scheduleBuilder.currentMode, 
                    currentDayOfWeek: dayOfWeek, 
                    schedule: { 
                        operations: scheduleBuilder.schedule.operations, 
                        interventions: intervention.where.includes('PILE REMOVAL') ? scheduleBuilder.schedule.interventions : appendToList(scheduleBuilder.schedule.interventions, intervention),
                        updatedDate: scheduleBuilder.schedule.updatedDate 
                    } 
                };
            }

            if (scheduleBuilder.currentMode === mode.INTERVENTION && row.items.length === 2) {
                const intervention = createIntervention(scheduleBuilder.currentDayOfWeek, row.items[0].text, row.items[1].text);

                return { 
                    currentMode: scheduleBuilder.currentMode, 
                    currentDayOfWeek: scheduleBuilder.currentDayOfWeek, 
                    schedule: { 
                        operations: scheduleBuilder.schedule.operations, 
                        interventions: intervention.where.includes('PILE REMOVAL') ? scheduleBuilder.schedule.interventions : appendToList(scheduleBuilder.schedule.interventions, intervention),
                        updatedDate: scheduleBuilder.schedule.updatedDate 
                    } 
                };
            }

            return scheduleBuilder;
        }, { currentMode: null, currentDayOfWeek: '', schedule: { operations: [], interventions: [], updatedDate: '' } });
    
    return final.schedule;
}