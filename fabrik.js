var colors = require('colors');

class Entity {
    name;

    constructor(name) {
        this.name = name;
    }

    getColouredName() {
        return this.name.magenta;
    }

    log() {
        console.log( this.getColouredName() + ': ' + Array.from(arguments).join(' ') );
    }

    success() {
        console.log( '!!'.green + this.getColouredName() + ': ' + Array.from(arguments).join(' ') );
    }

    toString() {
        return this.name;
    }
}

class Product extends Entity {
    dependent_tasks = [];

    constructor(name) {
        super(name);
    }

    requireTask(task) {
        this.log('Requires task', task);
        this.dependent_tasks.push(task);
    }

    getColouredName() {
        return ('(product) '+ this.name).blue;
    }

    // isComplete() {
    //     for ( let i in this.dependent_tasks ) {
    //         const task = this.dependent_tasks[i];

    //         if ( ! task.isComplete() ) {
    //             return false;
    //         }
    //     }

    //     return true;
    // }

    completion() {
        let total = this.dependent_tasks.length;
        let completed = 0;
        for ( let i in this.dependent_tasks ) {
            const task = this.dependent_tasks[i];

            if ( task.isComplete() ) {
                completed++;
            }
        }

        return completed/total;
    }
    
    cost() {
        // naive calculation:
        // cost = number of work cycles * employee_wage
        let cost = 0;

        for ( let i in this.dependent_tasks ) {
            const task = this.dependent_tasks[i];

            cost += task.getLength();
        }

        return cost;
    }

    isComplete() {
        return this.completion() >= 1;
    }

    shoutStatus() {
        this.log(' I am ' + (this.completion()*100).toFixed(2) + '% complete' );
    }
}

class Employee extends Entity {

    wage = 200; // what we pay per day
    productivity = 1; // between 0 and 1, employee productivity
    task_completion = 0;
    taskqueue = [];

    // needs
    energy = 1;

    // rest_timer
    rest_timer = -1;

    constructor(name, wage, productivity) {
        super(name);

        this.wage = wage;
        this.productivity = productivity;
    }

    assignTask(task) {
        this.log('I have been assigned', task);
        this.taskqueue.unshift(task);
    }

    decreaseEnergy(amt) {
        this.energy = Math.max(0, this.energy - amt );
        this.log('My energy level is now', (100*this.getAttenuatedEnergy()).toFixed(2) + '%' );
    }
    
    getAttenuatedEnergy() {
        const energy = this.energy;

        //https://easings.net/#easeOutExpo
        return energy === 1 ? 1 : 1 - Math.pow(2, -10 * energy);
    }
    
    getEfficiency() {
        return this.productivity*this.getAttenuatedEnergy();
    }

    takeBreak() {
        if ( this.energy < 0.2 && this.rest_timer === -1 ) {
            this.rest_timer = 10;
        }

        if ( this.rest_timer ) {
            this.rest_timer--;
            this.log( 'Resting...', this.rest_timer );
        }

        if ( this.rest_timer == 0 ) {
            this.energy = 1;
            this.rest_timer = -1;
        }
    }

    work() {
        if ( ! this.current_task && ! this.taskqueue.length ) {
            this.log('No work for me to do!');
            return;
        }

        if ( ! this.energy ) {
            this.log('Too tired to work! Burnt out!');
            this.takeBreak();
        }

        if ( ! this.current_task ) {
            this.current_task = this.taskqueue.pop();
        }

        if ( ! this.current_task.canBeDone() ) {
            this.log( 'Can\'t work on', this.current_task, 'yet! ')
            return;
        }

        this.log('Working on', this.current_task);

        this.current_task.increaseProgress(this.getEfficiency());

        this.decreaseEnergy(this.current_task.getEffort());

        if ( this.current_task.isComplete() ) {
            this.log( 'Finished task', this.current_task );
            this.current_task = false;
        }
    }
    
    getColouredName() {
        return ('(employee) ' + this.name).magenta;
    }
}

class Task extends Entity  {

    length = 1; // number of work cycles to complete task for an employee who is 100% productivity
    completion = 0; // %ge complete
    depends_upon = [];

    constructor(name, length) {
        super(name);

        this.length = length;
    }

    increaseProgress(amt) {
        amt = amt/this.length; // progress is a fraction of total number of work cycles 
        this.completion = Math.min(1, this.completion + amt );

        if ( this.isComplete() ) {
            this.log( 'Now complete!' );
        } else {
            this.log( (this.completion*100).toFixed(2) + '% complete' );
        }
    }

    isComplete() {
        // this.log('iscomplete completion', this.completion)
        return this.completion >= 1;
    }

    getEffort() {
        return this.length / 100;
    }

    toString() {
        return this.name + ' (' + (this.completion*100).toFixed(2) + '% complete)';
    }

    getColouredName() {
        return ('(task) ' + this.name).yellow;
    }

    dependsUpon(task) {
        this.depends_upon.push(task);
    }

    getLength() {
        return this.length;
    }

    /**
     * Are all dependent tasks complete
     */
    canBeDone() {
        let i = 0;

        for ( i in this.depends_upon ) {
            const task = this.depends_upon[i];
            if ( ! task.isComplete() ) {
                return false;
            }
        }

        return true;
    }
}

class Workflow extends Entity {
    constructor (name) {
        super(name);
    }
}

class MakeBottleCorks extends Workflow {

    employee1;
    employee2;
    cork;

    made_corks = [];

    constructor(name, employee1, employee2) {
        super(name);

        // we are making a cork for a bottle
        this.employee1 = employee1;
        this.employee2 = employee2;

        this.prepare();
    }

    // get ready to make a new cork
    prepare() {
        this.success('Getting ready to start on cork #' + (this.made_corks.length+1) );
        this.cork = new Product('Bottle cork');

        // task 1 - get the wood
        const task1  = new Task('Get wood', 2);
        this.cork.requireTask(task1);

        // task 2 - punch the wood to make the cork
        // (we need the wood first)
        const task2  = new Task('Punch cork', 0.5);
        task2.dependsUpon(task1);
        this.cork.requireTask(task2);

        // task 3 - put the cork on the shelf
        // (we need the cork first)
        const task3  = new Task('Put cork on shelf', 0.2); 
        task3.dependsUpon(task1);
        this.cork.requireTask(task3);

        // assign employee 1 to getting the cork and putting it on the shelf (tasks 1 & 3)
        this.employee1.assignTask(task1);
        this.employee1.assignTask(task3);

        // assign employee 2 to punching the cork
        this.employee2.assignTask(task2);

        this.success('TOTAL COST SO FAR (stock + employees): £' + ((this.made_corks.length)*this.cork.cost()) )
        this.success('TOTAL PROFIT (naive) SO FAR: £' + ((this.made_corks.length)*this.cork.cost()*0.2) )

    }

    work() {
        this.employee1.work();
        this.employee2.work();
        this.cork.shoutStatus();

        
        if ( this.cork.isComplete() ) {
            this.success('Workflow complete! Made a cork' );
            this.made_corks.push(this.cork);

            // start over
            this.prepare();
        }
    }

    getColouredName() {
        return ('(workflow) ' + this.name).cyan;
    }

}
const stefan = new Employee('Stefan', 100, 1);
const louise = new Employee('Louise', 100, 1);


const line1 = new MakeBottleCorks('Make bottle corks', stefan, louise);

setInterval( function() {
    line1.work();
}, 1000 );

// simple factory
// Making bottle corks
// 1. Get wood (length: 1)
// 2. Punch cork (length: 2)
// 3. Put cork on shelf (length: 1)
